const db = require('../data/db/db');

class EventService {
  static async emit(companyId, eventType, payload) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO EventLog (companyId, eventType, payload)
        VALUES (?, ?, ?)
      `;
      
      const payloadString = JSON.stringify(payload);
      
      db.run(query, [companyId, eventType, payloadString], function(err) {
        if (err) {
          console.error('Error emitting event:', err);
          // We don't reject here to prevent blocking the main operation, 
          // but in a strict system we might want to ensure event persistence.
          // For now, just log error.
          resolve(null); 
        } else {
          resolve(this.lastID);
        }
      });
    });
  }
}

module.exports = EventService;
