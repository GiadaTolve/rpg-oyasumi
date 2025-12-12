/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('housing_types').del();
  
  // Inserts seed entries
  await knex('housing_types').insert([
    { 
      id: 1, 
      name: "Stanza dell'Ordine", 
      cost_rem: 5, 
      cost_type: 'DAILY_SALARY', // Speciale: -5 dallo stipendio
      bonus_hp: 0, 
      bonus_slots: 5, 
      description: "10mq. Essenziale e spartana." 
    },
    { 
      id: 2, 
      name: "Container (Cosmicon Complex)", 
      cost_rem: 100, 
      cost_type: 'MONTHLY', 
      bonus_hp: 5, 
      bonus_slots: 10, 
      description: "25mq. Modulo abitativo industriale." 
    },
    { 
      id: 3, 
      name: "Monolocale (Wall Town)", 
      cost_rem: 120, 
      cost_type: 'MONTHLY', 
      bonus_hp: 5, 
      bonus_slots: 13, 
      description: "35mq. Piccolo ma funzionale." 
    },
    { 
      id: 4, 
      name: "Bilocale", 
      cost_rem: 150, 
      cost_type: 'MONTHLY', 
      bonus_hp: 5, 
      bonus_slots: 15, 
      description: "45mq. Spazio vitale adeguato." 
    },
    { 
      id: 5, 
      name: "Cottage", 
      cost_rem: 250, 
      cost_type: 'MONTHLY', 
      bonus_hp: 10, 
      bonus_slots: 15, 
      description: "55mq. Confortevole e indipendente." 
    },
    { 
      id: 6, 
      name: "Appartamento Borghese", 
      cost_rem: 280, 
      cost_type: 'MONTHLY', 
      bonus_hp: 10, 
      bonus_slots: 18, 
      description: "70mq. Finiture di pregio." 
    },
    { 
      id: 7, 
      name: "Villa", 
      cost_rem: 300, 
      cost_type: 'MONTHLY', 
      bonus_hp: 10, 
      bonus_slots: 20, 
      description: "85mq. Lusso e spazio." 
    },
    { 
      id: 8, 
      name: "Proprietà nel Paradise", 
      cost_rem: 400, 
      cost_type: 'MONTHLY', 
      bonus_hp: 15, 
      bonus_slots: 25, 
      description: "Esclusiva per possessori Pass Paradise." 
    }
  ]);
};