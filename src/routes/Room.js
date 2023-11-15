const express = require('express');
const { promisify } = require('util');
const Database = require('../configs/Database');

const router = express.Router();
const db = new Database();
const conn = db.connection;
const queryAsync = promisify(conn.query).bind(conn);

// Create a new room
router.post('/room', async (req, res) => {
  try {
    const { room_name, description, program, competency, duration_minutes, date_created, expiry_date } = req.body;

    // Insert the new room into the database
    const insertRoomQuery = `INSERT INTO room (room_name, description, program_id, competency_id, duration_minutes, date_created, expiry_date) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const values = [room_name, description, program, competency, duration_minutes, date_created, expiry_date];

    const result = await queryAsync(insertRoomQuery, values);
    const newRoomId = result.insertId;

    res.json({ success: true, message: 'Room created successfully', roomId: newRoomId });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ success: false, message: 'Failed to create a room' });
  }
});

// Read all rooms
router.get('/rooms', async (req, res) => {
  try {
     console.log('Handling /room/rooms route');
    const rooms = await queryAsync('SELECT * FROM room ORDER BY room_id DESC');
    res.json({ success: true, rooms });
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch rooms' });
  }
});

router.get('/refresh-rooms', async (req, res) => {
  try {
    const rooms = await queryAsync('SELECT * FROM room ORDER BY room_id DESC');
    res.json({ success: true, rooms });
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch rooms' });
  }
});

router.get('/rooms/:room_id', async (req, res) => {
  const { room_id } = req.params;
  try {
    const room = await queryAsync('SELECT * FROM room WHERE room_id = ?', [room_id]);

    if (room.length === 1) {
      res.json({ success: true, room: room[0] });
    } else {
      console.error('Room not found for room_id:', room_id);
      res.status(404).json({ success: false, message: 'Room not found' });
    }
  } catch (error) {
    console.error('Error fetching room:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch the room' });
  }
});

// Update a room by room_id
router.put('/room/:room_id', async (req, res) => {
  const { room_id } = req.params;
  try {
    const { room_name, description, program_id, competency_id, duration_minutes, date_created, expiry_date } = req.body;

    // Update the room in the database
    const updateRoomQuery = `UPDATE room SET room_name = ?, description = ?, program_id = ?, competency_id = ?, duration_minutes = ?, date_created = ?, expiry_date = ? WHERE room_id = ?`;
    const values = [room_name, description, program_id, competency_id, duration_minutes, date_created, expiry_date, room_id];

    const result = await queryAsync(updateRoomQuery, values);

    if (result.affectedRows === 1) {
      res.json({ success: true, message: 'Room updated successfully' });
    } else {
      res.status(404).json({ success: false, message: 'Room not found' });
    }
  } catch (error) {
    console.error('Error updating room:', error);
    res.status(500).json({ success: false, message: 'Failed to update the room' });
  }
});

// Delete a room by room_id
router.delete('/room/:room_id', async (req, res) => {
  const { room_id } = req.params;
  try {
    // Delete the room from the database
    const deleteRoomQuery = 'DELETE FROM room WHERE room_id = ?';

    const result = await queryAsync(deleteRoomQuery, [room_id]);

    if (result.affectedRows === 1) {
      res.json({ success: true, message: 'Room deleted successfully' });
    } else {
      res.status(404).json({ success: false, message: 'Room not found' });
    }
  } catch (error) {
    console.error('Error deleting room:', error);
    res.status(500).json({ success: false, message: 'Failed to delete the room' });
  }
});

module.exports = router;
