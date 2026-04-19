
const { sequelize } = require("./config/database");
require("./models");

async function checkRooms() {
  try {
    const [results] = await sequelize.query("SELECT * FROM rooms");
    console.log("Current Rooms:", JSON.stringify(results, null, 2));
    
    const [counts] = await sequelize.query("SELECT block, count(*) as count FROM rooms GROUP BY block");
    console.log("Counts by block:", counts);

    const [c_rooms] = await sequelize.query("SELECT room_number FROM rooms WHERE room_number LIKE 'C%'");
    console.log("Rooms starting with C:", c_rooms);

  } catch (err) {
    console.error("Error checking rooms:", err);
  } finally {
    await sequelize.close();
  }
}

checkRooms();
