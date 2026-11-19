<?php

if (!defined('_PS_VERSION_')) {
    exit;
}

/**
 * Piezas que NO valen (o hay que tener cuidado) para un modelo o para toda una marca.
 * Puede ser un producto de la tienda o un texto/medida («Neumático 10x3»).
 * Avisa en el buscador del presupuesto y al añadirla.
 */
class EcoRepairIncompat
{
    public static function forModel($idBrand, $idModel)
    {
        $p = _DB_PREFIX_;
        $rows = Db::getInstance()->executeS("SELECT * FROM `{$p}ecorepair_incompat`
            WHERE id_ecorepair_brand = " . (int) $idBrand . ' AND id_ecorepair_model IN (0, ' . (int) $idModel . ')
            ORDER BY level = \'block\' DESC, date_add DESC') ?: array();
        $ctx = Context::getContext();
        $out = array();
        foreach ($rows as $r) {
            $name = (int) $r['id_product'] ? Product::getProductName((int) $r['id_product'], (int) $r['id_product_attribute'] ?: null, (int) $ctx->language->id) : '';
            $out[] = array(
                'id' => (int) $r['id_ecorepair_incompat'],
                'id_product' => (int) $r['id_product'],
                'id_product_attribute' => (int) $r['id_product_attribute'],
                'label' => $name ?: $r['label'],
                'image' => (int) $r['id_product'] ? EcoRepairQuote::productImage((int) $r['id_product'], (int) $r['id_product_attribute'], '', (int) $ctx->shop->id) : '',
                'reason' => $r['reason'],
                'level' => $r['level'],
                'scope' => (int) $r['id_ecorepair_model'] ? 'model' : 'brand',
                'author' => $r['author'],
                'date' => $r['date_add'],
            );
        }

        return $out;
    }

    /**
     * Avisos que afectan a unos productos en un modelo: array(id_product => aviso).
     * Un aviso por producto entero vale para todas sus combinaciones.
     */
    public static function mapForProducts($idBrand, $idModel, array $productIds)
    {
        $productIds = array_values(array_filter(array_map('intval', $productIds)));
        if (!(int) $idBrand || !$productIds) {
            return array();
        }
        $rows = Db::getInstance()->executeS('SELECT * FROM `' . _DB_PREFIX_ . 'ecorepair_incompat`
            WHERE id_ecorepair_brand = ' . (int) $idBrand . ' AND id_ecorepair_model IN (0, ' . (int) $idModel . ')
              AND id_product IN (' . implode(',', $productIds) . ')') ?: array();
        $out = array();
        foreach ($rows as $r) {
            $k = (int) $r['id_product'] . '-' . (int) $r['id_product_attribute'];
            $out[$k] = array('level' => $r['level'], 'reason' => $r['reason'], 'scope' => (int) $r['id_ecorepair_model'] ? 'model' : 'brand');
        }

        return $out;
    }

    /** Aviso para un producto concreto (busca primero la combinación y luego el producto entero). */
    public static function find(array $map, $idProduct, $idAttr)
    {
        $k = (int) $idProduct . '-' . (int) $idAttr;
        if (isset($map[$k])) {
            return $map[$k];
        }

        return isset($map[(int) $idProduct . '-0']) ? $map[(int) $idProduct . '-0'] : null;
    }

    public static function save($idBrand, $idModel, array $d, $author)
    {
        if (!(int) $idBrand) {
            return array('ok' => false, 'error' => 'Falta la marca.');
        }
        $idProduct = isset($d['id_product']) ? max(0, (int) $d['id_product']) : 0;
        $label = Tools::substr(trim(strip_tags(isset($d['label']) ? (string) $d['label'] : '')), 0, 160);
        if (!$idProduct && $label === '') {
            return array('ok' => false, 'error' => 'Elige un producto de la tienda o escribe qué pieza es.');
        }
        $reason = Tools::substr(trim(strip_tags(isset($d['reason']) ? (string) $d['reason'] : '')), 0, 500);
        if ($reason === '') {
            return array('ok' => false, 'error' => 'Escribe por qué no vale (para que lo entienda el resto del equipo).');
        }
        $now = date('Y-m-d H:i:s');
        Db::getInstance()->insert('ecorepair_incompat', array(
            'id_ecorepair_brand' => (int) $idBrand,
            'id_ecorepair_model' => (int) $idModel,
            'id_product' => $idProduct,
            'id_product_attribute' => $idProduct ? max(0, (int) (isset($d['id_product_attribute']) ? $d['id_product_attribute'] : 0)) : 0,
            'label' => pSQL($label),
            'reason' => pSQL($reason),
            'level' => isset($d['level']) && $d['level'] === 'warn' ? 'warn' : 'block',
            'author' => pSQL(Tools::substr((string) $author, 0, 64)),
            'date_add' => $now,
        ));

        return array('ok' => true, 'id' => (int) Db::getInstance()->Insert_ID());
    }

    public static function delete($id)
    {
        Db::getInstance()->delete('ecorepair_incompat', 'id_ecorepair_incompat = ' . (int) $id);

        return array('ok' => true);
    }
}
