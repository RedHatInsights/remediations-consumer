exports.up = function(knex) {
    return knex.schema.createTable('systems', function (table) {
        table.uuid('id').primary();
        table.string('hostname', 255).nullable();
        table.string('display_name', 255).nullable();
        table.string('ansible_hostname', 255).nullable();
        table.timestamps(true, true);
    });
};

exports.down = function(knex) {
    return knex.schema.dropTable('systems');
}; 
