<?php

if (!defined('_PS_VERSION_')) {
    exit;
}

/**
 * Cobro de las reparaciones.
 *
 * - Señal: se apunta en el taller (sin pedido).
 * - Cobro final: se crea un pedido normal de PrestaShop (validateOrder) con las líneas de los presupuestos aceptados,
 *   «Pago aceptado» → factura con la numeración de siempre y descuento de stock.
 * - Las piezas van con su producto; mano de obra y otros conceptos van en el producto oculto «Servicio de taller».
 * - Los precios del pedido son los del presupuesto (congelados), con precios específicos solo para ese carrito.
 */
class EcoRepairPayment
{
    public static function methods()
    {
        return array(
            'cash' => 'Taller · Efectivo',
            'card' => 'Taller · Tarjeta',
            'transfer' => 'Taller · Transferencia',
        );
    }

    public static function typeNames()
    {
        return array('deposit' => 'Señal', 'final' => 'Cobro', 'diagnosis' => 'Diagnóstico', 'free' => 'Sin cargo');
    }

    /* ------------------------------------------------------------------ */
    /* Lectura                                                             */
    /* ------------------------------------------------------------------ */

    public static function forRepair($idRepair)
    {
        $p = _DB_PREFIX_;
        $rows = Db::getInstance()->executeS("SELECT pa.*, e.firstname, e.lastname FROM `{$p}ecorepair_payment` pa
            LEFT JOIN `{$p}employee` e ON e.id_employee = pa.id_employee
            WHERE pa.id_ecorepair = " . (int) $idRepair . ' ORDER BY pa.date_add ASC, pa.id_ecorepair_payment ASC');

        return $rows ?: array();
    }

    /** Líneas a cobrar: las de todos los presupuestos aceptados. */
    public static function acceptedLines($idRepair)
    {
        $lines = array();
        foreach (EcoRepairQuote::forRepair($idRepair) as $q) {
            if ($q['status'] === EcoRepairQuote::ACCEPTED) {
                foreach (EcoRepairQuote::lines((int) $q['id_ecorepair_quote']) as $l) {
                    $l['quote'] = EcoRepairQuote::label($q);
                    $lines[] = $l;
                }
            }
        }

        return $lines;
    }

    public static function summary($idRepair)
    {
        $repair = EcoRepair::get((int) $idRepair);
        $lines = self::acceptedLines($idRepair);
        $t = EcoRepairQuote::totals($lines);
        $paid = 0.0;
        $out = array();
        $methods = self::methods();
        $types = self::typeNames();
        foreach (self::forRepair($idRepair) as $pa) {
            $paid += (float) $pa['amount'];
            $out[] = array(
                'id' => (int) $pa['id_ecorepair_payment'],
                'type' => $pa['type'],
                'type_name' => isset($types[$pa['type']]) ? $types[$pa['type']] : $pa['type'],
                'method' => $pa['method'],
                'method_name' => isset($methods[$pa['method']]) ? $methods[$pa['method']] : $pa['method'],
                'amount' => (float) $pa['amount'],
                'id_order' => (int) $pa['id_order'],
                'employee' => trim($pa['firstname'] . ' ' . $pa['lastname']),
                'date' => $pa['date_add'],
            );
        }
        $due = $t['total_tax_incl'];

        return array(
            'due' => $due,
            'paid' => round($paid, 2),
            'pending' => max(0, round($due - $paid, 2)),
            'warranty_amount' => $t['warranty_amount'],
            'has_accepted' => (bool) $lines,
            'lines_count' => count($lines),
            'id_order' => $repair ? (int) $repair['id_order'] : 0,
            'payments' => $out,
        );
    }

    /* ------------------------------------------------------------------ */
    /* Señal                                                               */
    /* ------------------------------------------------------------------ */

    public static function addDeposit(array $repair, $method, $amount, $idEmployee)
    {
        $methods = self::methods();
        if (!isset($methods[$method])) {
            return array('ok' => false, 'error' => 'Elige la forma de pago.');
        }
        if ((int) $repair['id_order']) {
            return array('ok' => false, 'error' => 'Esta reparación ya está cobrada.');
        }
        $amount = round((float) str_replace(',', '.', (string) $amount), 2);
        if ($amount <= 0 || $amount > 99999) {
            return array('ok' => false, 'error' => 'Escribe el importe de la señal.');
        }
        $s = self::summary((int) $repair['id_ecorepair']);
        if ($s['due'] > 0 && $amount > $s['pending'] + 0.001) {
            return array('ok' => false, 'error' => 'La señal no puede ser mayor que lo pendiente (' . EcoRepairQuote::money($s['pending']) . ').');
        }
        self::insert((int) $repair['id_ecorepair'], (int) $repair['id_shop'], 'deposit', $method, $amount, $idEmployee, 0);
        EcoRepairLog::add((int) $repair['id_ecorepair'], $idEmployee, 'payment', 'Señal cobrada · ' . $methods[$method] . ' · ' . EcoRepairQuote::money($amount));

        return array('ok' => true);
    }

    protected static function insert($idRepair, $idShop, $type, $method, $amount, $idEmployee, $idOrder)
    {
        Db::getInstance()->insert('ecorepair_payment', array(
            'id_ecorepair' => (int) $idRepair,
            'id_shop' => (int) $idShop,
            'type' => pSQL($type),
            'method' => pSQL($method),
            'amount' => (float) $amount,
            'id_employee' => (int) $idEmployee,
            'id_order' => (int) $idOrder,
            'date_add' => date('Y-m-d H:i:s'),
        ));

        return (int) Db::getInstance()->Insert_ID();
    }

    /* ------------------------------------------------------------------ */
    /* Cobro final: pedido + factura + stock                               */
    /* ------------------------------------------------------------------ */

    /**
     * @param float|null $diagnosis Solo para reparaciones canceladas: importe del diagnóstico (IVA incluido).
     */
    public static function checkout(array $repair, $method, $idEmployee, $diagnosis = null)
    {
        $methods = self::methods();
        $idRepair = (int) $repair['id_ecorepair'];
        if ((int) $repair['id_order']) {
            return array('ok' => false, 'error' => 'Esta reparación ya está cobrada (pedido ' . (int) $repair['id_order'] . ').');
        }

        if ($repair['status'] === EcoRepairStatus::CANCELLED) {
            $amount = round((float) str_replace(',', '.', (string) $diagnosis), 2);
            if ($amount <= 0) {
                return array('ok' => false, 'error' => 'Escribe el importe del diagnóstico.');
            }
            $lines = array(array('type' => 'labour', 'id_product' => 0, 'id_product_attribute' => 0, 'name' => 'Diagnóstico',
                'reference' => '', 'qty' => 1, 'unit_price_tax_excl' => round($amount / 1.21, 6), 'tax_rate' => 21, 'warranty' => 0,
                'price' => $amount, 'total' => $amount));
            $type = 'diagnosis';
        } else {
            $lines = self::acceptedLines($idRepair);
            if (!$lines) {
                return array('ok' => false, 'error' => 'No hay ningún presupuesto aceptado que cobrar.');
            }
            $type = 'final';
        }
        $totals = EcoRepairQuote::totals($lines);
        $free = $totals['total_tax_incl'] <= 0;
        if (!$free && !isset($methods[$method])) {
            return array('ok' => false, 'error' => 'Elige la forma de pago.');
        }

        // Si todo va en garantía y no hay piezas, no hace falta pedido
        $hasParts = false;
        foreach ($lines as $l) {
            if ($l['type'] === 'part' && $l['id_product']) {
                $hasParts = true;
            }
        }
        if ($free && !$hasParts) {
            self::insert($idRepair, (int) $repair['id_shop'], 'free', 'warranty', 0, $idEmployee, 0);
            EcoRepairLog::add($idRepair, $idEmployee, 'payment', 'Sin cargo (garantía): no se crea pedido');

            return array('ok' => true, 'id_order' => 0, 'free' => true);
        }

        $order = self::createOrder($repair, $lines, $free ? 'Taller · Garantía (sin cargo)' : $methods[$method], $idEmployee);
        if (!$order['ok']) {
            return $order;
        }
        $idOrder = (int) $order['id_order'];

        // Pagos: la señal ya cobrada + lo que se cobra ahora
        $s = self::summary($idRepair);
        $now = max(0, round((float) $order['total'] - $s['paid'], 2));
        self::insert($idRepair, (int) $repair['id_shop'], $free ? 'free' : $type, $free ? 'warranty' : $method, $now, $idEmployee, $idOrder);
        Db::getInstance()->update('ecorepair_payment', array('id_order' => $idOrder), 'id_ecorepair = ' . $idRepair . ' AND id_order = 0');
        Db::getInstance()->update('ecorepair', array('id_order' => $idOrder, 'date_upd' => date('Y-m-d H:i:s')), 'id_ecorepair = ' . $idRepair);
        self::splitOrderPayments($idOrder, $idRepair);

        EcoRepairLog::add($idRepair, $idEmployee, 'payment', ($free ? 'Garantía sin cargo' : 'Cobrado ' . EcoRepairQuote::money($now) . ' · ' . $methods[$method])
            . ' · pedido ' . $order['reference'] . ' (total ' . EcoRepairQuote::money($order['total']) . ')');

        return array('ok' => true, 'id_order' => $idOrder, 'reference' => $order['reference'], 'total' => $order['total'], 'charged' => $now);
    }

    /** Producto oculto para mano de obra y otros conceptos. Se crea la primera vez. */
    public static function serviceProduct()
    {
        $id = (int) Configuration::get('ECOREPAIRS_SERVICE_PRODUCT');
        if ($id) {
            $p = new Product($id);
            if (Validate::isLoadedObject($p)) {
                return $id;
            }
        }
        $p = new Product();
        $name = array();
        foreach (Language::getLanguages(false) as $lang) {
            $name[(int) $lang['id_lang']] = 'Servicio de taller';
        }
        $p->name = $name;
        $p->link_rewrite = array_map(function () {
            return 'servicio-de-taller';
        }, $name);
        $p->reference = 'TALLER';
        $p->price = 0;
        $p->id_tax_rules_group = self::taxGroupFor21();
        $p->is_virtual = 1;
        $p->visibility = 'none';
        $p->available_for_order = 1;
        $p->show_price = 0;
        $p->active = 1;
        $p->indexed = 0;
        $p->id_category_default = (int) Configuration::get('PS_HOME_CATEGORY');
        if (!$p->add()) {
            return 0;
        }
        $p->addToCategories(array((int) Configuration::get('PS_HOME_CATEGORY')));
        StockAvailable::setProductOutOfStock((int) $p->id, 1);
        StockAvailable::setQuantity((int) $p->id, 0, 999999);
        Configuration::updateValue('ECOREPAIRS_SERVICE_PRODUCT', (int) $p->id);

        return (int) $p->id;
    }

    /** Grupo de impuestos del 21 % en España. */
    public static function taxGroupFor21()
    {
        $id = (int) Configuration::get('ECOREPAIRS_TAX_GROUP_21');
        if ($id) {
            return $id;
        }
        $p = _DB_PREFIX_;
        $id = (int) Db::getInstance()->getValue("SELECT trg.id_tax_rules_group FROM `{$p}tax_rules_group` trg
            INNER JOIN `{$p}tax_rule` tr ON tr.id_tax_rules_group = trg.id_tax_rules_group
            INNER JOIN `{$p}tax` t ON t.id_tax = tr.id_tax
            WHERE trg.active = 1 AND trg.deleted = 0 AND t.active = 1 AND t.rate = 21
              AND tr.id_country = " . (int) Country::getByIso('ES') . '
            ORDER BY trg.id_tax_rules_group ASC');
        if ($id) {
            Configuration::updateValue('ECOREPAIRS_TAX_GROUP_21', $id);
        }

        return $id;
    }

    /** Transportista gratuito para los pedidos del taller (recogida en tienda). */
    public static function carrier()
    {
        $id = (int) Configuration::get('ECOREPAIRS_CARRIER');
        if ($id) {
            $c = new Carrier($id);
            if (Validate::isLoadedObject($c) && !$c->deleted) {
                return (int) $c->id;
            }
        }
        $p = _DB_PREFIX_;

        return (int) Db::getInstance()->getValue("SELECT id_carrier FROM `{$p}carrier` WHERE deleted = 0 AND active = 1 AND is_free = 1
            ORDER BY (LOWER(name) LIKE '%recog%') DESC, (LOWER(name) LIKE '%tienda%') DESC, id_carrier ASC");
    }

    protected static function createOrder(array $repair, array $lines, $paymentName, $idEmployee)
    {
        $context = Context::getContext();
        $idCustomer = (int) $repair['id_customer'];
        $customer = new Customer($idCustomer);
        if (!Validate::isLoadedObject($customer)) {
            return array('ok' => false, 'error' => 'El cliente de la reparación no existe.');
        }
        $idAddress = (int) $repair['id_address_invoice'] ?: EcoRepairCustomer::orderAddress($idCustomer);
        if (!$idAddress) {
            return array('ok' => false, 'error' => 'No se pudo preparar la dirección del cliente para el pedido.');
        }

        // Agrupar: piezas por producto/combinación; el resto en «Servicio de taller»
        $items = array();
        $serviceNames = array();
        $serviceExcl = 0.0;
        $hasService = false;
        foreach ($lines as $l) {
            $excl = !empty($l['warranty']) ? 0.0 : (float) $l['unit_price_tax_excl'];
            if ($l['type'] === 'part' && (int) $l['id_product']) {
                if ((float) (int) $l['qty'] !== (float) $l['qty']) {
                    return array('ok' => false, 'error' => 'La pieza «' . $l['name'] . '» tiene una cantidad con decimales.');
                }
                $k = (int) $l['id_product'] . '-' . (int) $l['id_product_attribute'];
                if (!isset($items[$k])) {
                    $items[$k] = array('id_product' => (int) $l['id_product'], 'id_product_attribute' => (int) $l['id_product_attribute'], 'qty' => 0, 'amount' => 0.0);
                }
                $items[$k]['qty'] += (int) $l['qty'];
                $items[$k]['amount'] += (int) $l['qty'] * $excl;
            } else {
                if ((int) round($l['tax_rate']) !== 21 && $excl > 0) {
                    return array('ok' => false, 'error' => 'La línea «' . $l['name'] . '» tiene un IVA distinto del 21 %. Cámbialo en el presupuesto (solo las piezas pueden llevar otro IVA).');
                }
                $hasService = true;
                $serviceExcl += (float) $l['qty'] * $excl;
                $serviceNames[] = $l['name'] . ((float) $l['qty'] != 1 ? ' ×' . str_replace('.', ',', rtrim(rtrim(number_format((float) $l['qty'], 2, '.', ''), '0'), '.')) : '');
            }
        }
        if ($hasService) {
            $idService = self::serviceProduct();
            if (!$idService || !self::taxGroupFor21()) {
                return array('ok' => false, 'error' => 'No se pudo preparar el producto «Servicio de taller» (falta un impuesto del 21 % para España).');
            }
            $items['service'] = array('id_product' => $idService, 'id_product_attribute' => 0, 'qty' => 1, 'amount' => $serviceExcl);
        }

        $cart = new Cart();
        $cart->id_customer = $idCustomer;
        $cart->id_address_delivery = $idAddress;
        $cart->id_address_invoice = $idAddress;
        $cart->id_currency = (int) Configuration::get('PS_CURRENCY_DEFAULT');
        $cart->id_lang = (int) $context->language->id;
        $cart->id_shop = (int) $repair['id_shop'];
        $cart->id_shop_group = (int) Shop::getGroupFromShop((int) $repair['id_shop']);
        $cart->secure_key = $customer->secure_key;
        $needCarrier = false;
        foreach ($items as $k => $it) {
            if ($k !== 'service') {
                $needCarrier = true;
            }
        }
        if ($needCarrier) {
            $cart->id_carrier = self::carrier();
            if (!$cart->id_carrier) {
                return array('ok' => false, 'error' => 'Falta un transportista gratuito para los pedidos del taller (por ejemplo «Recogida en tienda»). Elígelo en Ajustes del taller.');
            }
        }
        if (!$cart->add()) {
            return array('ok' => false, 'error' => 'No se pudo crear el carrito.');
        }

        $db = Db::getInstance();
        $now = date('Y-m-d H:i:s');
        foreach ($items as $it) {
            // Directo a la tabla: así se pueden cobrar piezas sin stock o que no se venden online
            $db->insert('cart_product', array(
                'id_cart' => (int) $cart->id,
                'id_product' => (int) $it['id_product'],
                'id_address_delivery' => $idAddress,
                'id_shop' => (int) $cart->id_shop,
                'id_product_attribute' => (int) $it['id_product_attribute'],
                'id_customization' => 0,
                'quantity' => (int) $it['qty'],
                'date_add' => $now,
            ));
            $sp = new SpecificPrice();
            $sp->id_product = (int) $it['id_product'];
            $sp->id_product_attribute = (int) $it['id_product_attribute'];
            $sp->id_cart = (int) $cart->id;
            $sp->id_shop = (int) $cart->id_shop;
            $sp->id_shop_group = 0;
            $sp->id_currency = 0;
            $sp->id_country = 0;
            $sp->id_group = 0;
            $sp->id_customer = 0;
            $sp->from_quantity = 1;
            $sp->price = round($it['amount'] / max(1, $it['qty']), 6);
            $sp->reduction = 0;
            $sp->reduction_tax = 1;
            $sp->reduction_type = 'amount';
            $sp->from = '0000-00-00 00:00:00';
            $sp->to = '0000-00-00 00:00:00';
            $sp->add();
        }

        $cart = new Cart((int) $cart->id);
        if ($needCarrier) {
            $cart->setDeliveryOption(array($idAddress => (int) $cart->id_carrier . ','));
            $cart->update();
            $cart = new Cart((int) $cart->id);
            if ($cart->getOrderTotal(true, Cart::ONLY_SHIPPING) > 0) {
                self::cleanCart($cart);

                return array('ok' => false, 'error' => 'El transportista elegido para el taller cobra envío. Elige uno gratuito en Ajustes del taller.');
            }
        }

        // validateOrder trabaja con el contexto
        $prev = array($context->cart, $context->customer, $context->currency);
        $context->cart = $cart;
        $context->customer = $customer;
        $context->currency = new Currency((int) $cart->id_currency);
        $total = (float) $cart->getOrderTotal(true, Cart::BOTH);
        $module = Module::getInstanceByName('ecorepairs');
        try {
            $module->validateOrder(
                (int) $cart->id,
                (int) Configuration::get('PS_OS_PAYMENT'),
                $total,
                $paymentName,
                'Reparación ' . $repair['reference'],
                array(),
                (int) $cart->id_currency,
                false,
                $customer->secure_key
            );
        } catch (Exception $e) {
            list($context->cart, $context->customer, $context->currency) = $prev;
            PrestaShopLogger::addLog('ecorepairs cobro: ' . $e->getMessage(), 3, null, 'EcoRepair', (int) $repair['id_ecorepair']);
            self::cleanCart($cart);

            return array('ok' => false, 'error' => 'PrestaShop no pudo crear el pedido: ' . $e->getMessage());
        }
        list($context->cart, $context->customer, $context->currency) = $prev;
        $idOrder = (int) $module->currentOrder;
        $db->delete('specific_price', 'id_cart = ' . (int) $cart->id);
        if (!$idOrder) {
            return array('ok' => false, 'error' => 'PrestaShop no creó el pedido.');
        }

        // Nombre de la línea de servicio con el detalle (sale así en la factura)
        if ($hasService) {
            $label = Tools::substr('Taller ' . $repair['reference'] . ': ' . implode(', ', $serviceNames), 0, 255);
            $db->update('order_detail', array('product_name' => pSQL($label)), 'id_order = ' . $idOrder . ' AND product_id = ' . (int) $items['service']['id_product']);
        }
        $order = new Order($idOrder);

        return array('ok' => true, 'id_order' => $idOrder, 'reference' => $order->reference, 'total' => round((float) $order->total_paid_tax_incl, 2));
    }

    protected static function cleanCart(Cart $cart)
    {
        Db::getInstance()->delete('specific_price', 'id_cart = ' . (int) $cart->id);
        $cart->delete();
    }

    /**
     * Si hubo señal, el pago del pedido se reparte: la señal con su forma de pago y el resto con la del cobro.
     */
    protected static function splitOrderPayments($idOrder, $idRepair)
    {
        $payments = Db::getInstance()->executeS('SELECT * FROM `' . _DB_PREFIX_ . 'ecorepair_payment`
            WHERE id_ecorepair = ' . (int) $idRepair . ' ORDER BY id_ecorepair_payment ASC');
        if (!$payments || count($payments) < 2) {
            return;
        }
        $order = new Order((int) $idOrder);
        $methods = self::methods();
        $existing = OrderPayment::getByOrderReference($order->reference);
        foreach ($existing as $op) {
            $op->delete();
        }
        foreach ($payments as $pa) {
            if ((float) $pa['amount'] <= 0) {
                continue;
            }
            $op = new OrderPayment();
            $op->order_reference = $order->reference;
            $op->id_currency = (int) $order->id_currency;
            $op->conversion_rate = 1;
            $op->amount = (float) $pa['amount'];
            $op->payment_method = isset($methods[$pa['method']]) ? $methods[$pa['method']] : $pa['method'];
            $op->date_add = $pa['date_add'];
            $op->add();
        }
    }

    /* ------------------------------------------------------------------ */
    /* Cierre del taller y exportación                                     */
    /* ------------------------------------------------------------------ */

    public static function dayClose($idShop, $date)
    {
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $date) || !Validate::isDate($date)) {
            $date = date('Y-m-d');
        }
        $p = _DB_PREFIX_;
        $rows = Db::getInstance()->executeS("SELECT pa.*, r.reference, c.firstname, c.lastname, o.reference AS order_reference
            FROM `{$p}ecorepair_payment` pa
            INNER JOIN `{$p}ecorepair` r ON r.id_ecorepair = pa.id_ecorepair
            LEFT JOIN `{$p}customer` c ON c.id_customer = r.id_customer
            LEFT JOIN `{$p}orders` o ON o.id_order = pa.id_order
            WHERE pa.id_shop = " . (int) $idShop . " AND pa.date_add BETWEEN '" . pSQL($date) . " 00:00:00' AND '" . pSQL($date) . " 23:59:59'
            ORDER BY pa.date_add ASC") ?: array();
        $methods = self::methods();
        $types = self::typeNames();
        $by = array();
        foreach ($methods as $k => $n) {
            $by[$k] = array('method' => $k, 'name' => $n, 'count' => 0, 'total' => 0.0);
        }
        $list = array();
        foreach ($rows as $r) {
            if (isset($by[$r['method']])) {
                ++$by[$r['method']]['count'];
                $by[$r['method']]['total'] = round($by[$r['method']]['total'] + (float) $r['amount'], 2);
            }
            $list[] = array(
                'time' => Tools::substr($r['date_add'], 11, 5),
                'reference' => $r['reference'],
                'id_ecorepair' => (int) $r['id_ecorepair'],
                'customer' => trim($r['firstname'] . ' ' . $r['lastname']),
                'type' => isset($types[$r['type']]) ? $types[$r['type']] : $r['type'],
                'method' => isset($methods[$r['method']]) ? $methods[$r['method']] : 'Sin cargo',
                'amount' => (float) $r['amount'],
                'order' => (string) $r['order_reference'],
            );
        }
        $total = 0.0;
        foreach ($by as $b) {
            $total += $b['total'];
        }

        return array('date' => $date, 'methods' => array_values($by), 'payments' => $list, 'total' => round($total, 2));
    }

    /**
     * Facturas de los pedidos del taller de un trimestre, para el gestor (CSV que abre Excel).
     */
    public static function quarterCsv($idShop, $year, $quarter, $idLang)
    {
        $year = max(2020, min(2100, (int) $year));
        $quarter = max(1, min(4, (int) $quarter));
        $from = sprintf('%04d-%02d-01 00:00:00', $year, ($quarter - 1) * 3 + 1);
        $to = date('Y-m-d 23:59:59', strtotime(sprintf('%04d-%02d-01', $year, $quarter * 3) . ' +1 month -1 day'));
        $p = _DB_PREFIX_;
        $rows = Db::getInstance()->executeS("SELECT DISTINCT oi.id_order_invoice, oi.date_add, oi.total_paid_tax_excl, oi.total_paid_tax_incl,
                o.id_order, o.payment, o.id_address_invoice, c.firstname, c.lastname, c.company, r.reference AS repair
            FROM `{$p}order_invoice` oi
            INNER JOIN `{$p}orders` o ON o.id_order = oi.id_order
            INNER JOIN `{$p}ecorepair` r ON r.id_order = o.id_order
            LEFT JOIN `{$p}customer` c ON c.id_customer = o.id_customer
            WHERE r.id_shop = " . (int) $idShop . " AND oi.date_add BETWEEN '" . pSQL($from) . "' AND '" . pSQL($to) . "'
            ORDER BY oi.date_add ASC") ?: array();

        $fmt = function ($n) {
            return number_format((float) $n, 2, ',', '');
        };
        $out = fopen('php://temp', 'r+');
        fwrite($out, "\xEF\xBB\xBF");
        fputcsv($out, array('Fecha', 'Nº factura', 'Reparación', 'Cliente', 'NIF', 'Base imponible', 'IVA', 'Total', 'Forma de pago'), ';');
        $sum = array(0, 0, 0);
        foreach ($rows as $r) {
            $inv = new OrderInvoice((int) $r['id_order_invoice']);
            $addr = new Address((int) $r['id_address_invoice']);
            $nif = Validate::isLoadedObject($addr) ? ($addr->vat_number ?: $addr->dni) : '';
            $name = $r['company'] ?: trim($r['firstname'] . ' ' . $r['lastname']);
            $tax = (float) $r['total_paid_tax_incl'] - (float) $r['total_paid_tax_excl'];
            $sum[0] += (float) $r['total_paid_tax_excl'];
            $sum[1] += $tax;
            $sum[2] += (float) $r['total_paid_tax_incl'];
            fputcsv($out, array(
                date('d/m/Y', strtotime($r['date_add'])),
                $inv->getInvoiceNumberFormatted((int) $idLang),
                $r['repair'],
                $name,
                $nif,
                $fmt($r['total_paid_tax_excl']),
                $fmt($tax),
                $fmt($r['total_paid_tax_incl']),
                $r['payment'],
            ), ';');
        }
        fputcsv($out, array('', '', '', 'TOTAL', '', $fmt($sum[0]), $fmt($sum[1]), $fmt($sum[2]), ''), ';');
        rewind($out);
        $csv = stream_get_contents($out);
        fclose($out);

        return array('filename' => 'taller-' . $year . '-T' . $quarter . '.csv', 'csv' => $csv, 'count' => count($rows));
    }
}
