exports.up = function(knex) {
    return knex.schema.alterTable('systems', function (table) {
        table.string('satellite_org_id', 50).nullable();
        table.string('owner_id', 50).nullable();
    });
};

exports.down = function(knex) {
    return knex.schema.alterTable('systems', function (table) {
        table.dropColumn('satellite_org_id');
        table.dropColumn('owner_id');
    });
};
