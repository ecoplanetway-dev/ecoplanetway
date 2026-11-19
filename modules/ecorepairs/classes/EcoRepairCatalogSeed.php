<?php

if (!defined('_PS_VERSION_')) {
    exit;
}

/**
 * Catálogo de marcas y modelos habituales en el mercado español.
 * importMissing() solo añade lo que falta: no reactiva lo que se haya ocultado ni cambia nombres.
 */
class EcoRepairCatalogSeed
{
    public static function data()
    {
        return array(
            array('Patinete', 'scooter', array(
                'Xiaomi' => array('M365', 'M365 Pro', 'Mi Pro 2', 'Mi 1S', 'Essential', 'Lite', 'Scooter 3', 'Scooter 3 Lite', 'Scooter 4', 'Scooter 4 Lite', 'Scooter 4 Lite 2ª gen', 'Scooter 4 Pro', 'Scooter 4 Pro 2ª gen', 'Scooter 4 Go', 'Scooter 4 Ultra', 'Scooter 5', 'Scooter 5 Pro', 'Scooter 5 Max'),
                'Segway' => array('Ninebot ES1', 'Ninebot ES2', 'Ninebot ES4', 'Ninebot E22', 'Ninebot E25', 'Ninebot E45', 'Ninebot D18', 'Ninebot D28', 'Ninebot D38', 'Ninebot E2', 'Ninebot E2 Plus', 'Ninebot E2 Pro', 'Ninebot F20', 'Ninebot F25', 'Ninebot F30', 'Ninebot F40', 'Ninebot F2', 'Ninebot F2 Plus', 'Ninebot F2 Pro', 'Ninebot Max G30', 'Ninebot Max G30D', 'Ninebot Max G30LE', 'Ninebot Max G2', 'Ninebot G2', 'Ninebot P65', 'Ninebot P100', 'Ninebot ZT3 Pro', 'GT1', 'GT2'),
                'Cecotec' => array('Bongo Serie A', 'Bongo Serie A Advance', 'Bongo Serie D', 'Bongo D20', 'Bongo D30', 'Bongo Serie S', 'Bongo Serie Z', 'Bongo Z Off Road', 'Bongo Serie X', 'Bongo X45', 'Bongo X65', 'Bongo Serie M'),
                'Kugoo' => array('S1', 'S1 Pro', 'S3', 'M4', 'M4 Pro', 'G-Booster', 'G2 Pro', 'Kirin G3', 'Kirin M4', 'Kirin M5', 'Kirin G2 Pro', 'Kirin S1 Pro'),
                'Kukirin' => array('G2', 'G2 Pro', 'G2 Max', 'G3', 'G3 Pro', 'G4', 'C1 Pro'),
                'Smartgyro' => array('Rockway', 'Xtreme XD', 'Xtreme City', 'Xtreme Speedway', 'Speedway', 'Ziro', 'Crossover', 'K2', 'K2 Pro', 'Raptor'),
                'Dualtron' => array('Mini', 'Pop', 'Togo', 'Eagle', 'Spider', 'Thunder', 'Thunder 2', 'Thunder 3', 'Victor', 'Achilleus', 'Storm', 'Ultra', 'Ultra 2', 'Compact', 'X'),
                'Zero' => array('8', '8X', '9', '10', '10X', '11X'),
                'Inokim' => array('Light 2', 'Quick 4', 'OX', 'OXO'),
                'Kaabo' => array('Skywalker 8', 'Skywalker 10', 'Mantis 8', 'Mantis 10', 'Wolf Warrior 11', 'Wolf King GT'),
                'Vsett' => array('8', '9', '10+', '11+'),
                'NIU' => array('KQi1', 'KQi2', 'KQi3 Sport', 'KQi3 Pro', 'KQi3 Max', 'KQi Air', 'KQi 100P', 'KQi 300X'),
                'Pure Electric' => array('Air', 'Air Pro', 'Advance', 'Advance+', 'Advance Flex'),
                'Ducati' => array('Pro-I Evo', 'Pro-II Evo', 'Pro-III'),
                'Jeep' => array('Urban Camou', '2XE Adventurer'),
                'Youin' => array('You-Go', 'You-Ride', 'XL1', 'XL2'),
                'Navee' => array('V40', 'V50', 'N65', 'S65', 'GT3'),
                'Joyor' => array('Y5S', 'Y8S', 'S5', 'S10'),
                'Hiboy' => array('S2', 'S2 Pro', 'S2 Max'),
                'Aovo' => array('Pro M365', 'ES80'),
                'Mercane' => array('WideWheel', 'WideWheel Pro', 'MX60', 'Jubilant'),
                'Teverun' => array('Fighter Mini', 'Fighter 11', 'Blade Mini'),
                'Inmotion' => array('L9', 'S1', 'Climber', 'RS'),
                'Zwheel' => array('ZLion', 'ZFox', 'E9'),
                'Olsson' => array('Fresh', 'Fly', 'Rush'),
                'Ice' => array('Q5', 'V5'),
                'Motus' => array('Scooty 10', 'Pro 10'),
                'Apollo' => array('City', 'Ghost', 'Phantom'),
                'Nami' => array('Burn-E 2'),
                'iScooter' => array('i9', 'i9 Max', 'iX6'),
            )),
            array('Bicicleta eléctrica', 'bike', array(
                'Moma Bikes' => array('E-MTB 26', 'E-MTB 29', 'E-City 28', 'E-Road 28', 'E-Bike 20 plegable', 'E-Fat 26'),
                'Orbea' => array('Vibe H10', 'Vibe H30', 'Kemen 30', 'Wild', 'Rise', 'Gain', 'Diem'),
                'Specialized' => array('Turbo Vado', 'Turbo Como', 'Turbo Tero', 'Turbo Levo', 'Turbo Kenevo', 'Turbo Creo'),
                'Trek' => array('Allant+', 'Verve+', 'Dual Sport+', 'Powerfly', 'Rail', 'Fetch+'),
                'Giant' => array('Explore E+', 'Talon E+', 'Fathom E+', 'Stance E+', 'Trance X E+', 'Reign E+', 'Roam E+', 'FastRoad E+'),
                'Cube' => array('Kathmandu Hybrid', 'Touring Hybrid', 'Ella Ride Hybrid', 'Reaction Hybrid', 'Stereo Hybrid', 'Nuroad Hybrid'),
                'BH' => array('Atom', 'Atom X', 'Core', 'iLynx', 'Oxford', 'Xtep'),
                'Haibike' => array('Trekking', 'AllMtn', 'Sduro HardSeven', 'Nduro', 'Adventr'),
                'Cannondale' => array('Tesoro Neo', 'Adventure Neo', 'Moterra', 'Synapse Neo'),
                'Scott' => array('Sub eRide', 'Axis eRide', 'Patron eRide', 'Strike eRide', 'Genius eRide'),
                'Merida' => array('eSpresso', 'eBig.Nine', 'eOne-Forty', 'eOne-Sixty'),
                'Mondraker' => array('Prime', 'Crafty', 'Level'),
                'Megamo' => array('Natural', 'Ranger', 'Crave'),
                'Coluer' => array('Bliss', 'Poseidon'),
                'Lapierre' => array('Overvolt'),
                'Decathlon' => array('Rockrider E-ST 100', 'Rockrider E-ST 500', 'Rockrider E-EXPL 520', 'Riverside 500E', 'Elops 920E', 'Tilt 500E'),
                'Fiido' => array('D3 Pro', 'D11', 'M1 Pro', 'C11', 'X', 'Titan'),
                'ADO' => array('A20', 'A20 Air', 'A26', 'Air 20'),
                'Engwe' => array('EP-2 Pro', 'Engine Pro', 'C20', 'M20', 'L20', 'T14'),
                'Himiway' => array('Cruiser', 'Cobra', 'Big Dog', 'Zebra'),
                'Littium' => array('Ibiza Dogma', 'Kaos', 'Mantis'),
                'Xiaomi' => array('Himo Z20', 'Himo C20', 'Qicycle'),
                'Ducati' => array('MG-20', 'SCR-E'),
                'Gazelle' => array('Ultimate', 'Arroyo', 'Paris C7'),
                'Riese & Müller' => array('Load', 'Packster', 'Homage'),
                'Brompton' => array('Electric C Line'),
                'VanMoof' => array('S3', 'X3', 'S5', 'A5'),
                'Cowboy' => array('3', '4', 'Cruiser'),
                'Tenways' => array('CGO600', 'CGO800S', 'AGO X'),
            )),
        );
    }

    /**
     * Añade las categorías, marcas y modelos que falten. Devuelve cuántas marcas y modelos se añadieron.
     */
    public static function importMissing()
    {
        $db = Db::getInstance();
        $p = _DB_PREFIX_;
        $added = array('brands' => 0, 'models' => 0);
        foreach (self::data() as $row) {
            list($catName, $icon, $brands) = $row;
            $idCat = (int) $db->getValue("SELECT id_ecorepair_category FROM `{$p}ecorepair_category`
                WHERE LOWER(name) = '" . pSQL(Tools::strtolower($catName)) . "'");
            if (!$idCat) {
                $pos = (int) $db->getValue("SELECT IFNULL(MAX(position), -1) + 1 FROM `{$p}ecorepair_category`");
                $db->insert('ecorepair_category', array('name' => pSQL($catName), 'icon' => pSQL($icon), 'position' => $pos, 'active' => 1));
                $idCat = (int) $db->Insert_ID();
            }
            foreach ($brands as $brand => $models) {
                $idBrand = (int) $db->getValue("SELECT id_ecorepair_brand FROM `{$p}ecorepair_brand`
                    WHERE id_ecorepair_category = {$idCat} AND LOWER(name) = '" . pSQL(Tools::strtolower($brand)) . "'");
                if (!$idBrand) {
                    $db->insert('ecorepair_brand', array('id_ecorepair_category' => $idCat, 'name' => pSQL($brand), 'active' => 1));
                    $idBrand = (int) $db->Insert_ID();
                    ++$added['brands'];
                }
                $existing = array();
                foreach ($db->executeS("SELECT LOWER(name) AS n FROM `{$p}ecorepair_model` WHERE id_ecorepair_brand = {$idBrand}") ?: array() as $m) {
                    $existing[$m['n']] = true;
                }
                foreach ($models as $model) {
                    if (isset($existing[Tools::strtolower($model)])) {
                        continue;
                    }
                    $db->insert('ecorepair_model', array('id_ecorepair_brand' => $idBrand, 'name' => pSQL($model), 'active' => 1));
                    ++$added['models'];
                }
            }
        }

        return $added;
    }
}
