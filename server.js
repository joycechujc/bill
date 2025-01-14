// server.js
const express = require('express');
const cors = require('cors');
const Airtable = require('airtable');
const app = express();

// Replace these with your actual values
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN || 'your_token_here';
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || 'your_base_id_here';

// Configure Airtable
const base = new Airtable({apiKey: AIRTABLE_TOKEN}).base(AIRTABLE_BASE_ID);

app.use(cors());
app.use(express.json());

// Add participant
app.post('/api/participants', async (req, res) => {
    try {
        const record = await base('Participants').create({
            "Name": req.body.name
        });
        res.json(record);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add expense
app.post('/api/expenses', async (req, res) => {
    try {
        // First create the expense record
        const expenseRecord = await base('Expenses').create({
            "Description": req.body.description,
            "Amount": req.body.amount,
            "Currency": req.body.currency,
            "PaidBy": req.body.paidBy,
            "Date": new Date().toISOString()
        });

        // Then create share records for each participant
        const sharePromises = Object.entries(req.body.shares).map(([participant, amount]) => {
            return base('Shares').create({
                "ExpenseId": expenseRecord.id,
                "Participant": participant,
                "Amount": amount
            });
        });

        await Promise.all(sharePromises);
        res.json(expenseRecord);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all participants
app.get('/api/participants', async (req, res) => {
    try {
        const records = await base('Participants').select().all();
        res.json(records.map(record => record.fields));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all expenses
app.get('/api/expenses', async (req, res) => {
    try {
        const records = await base('Expenses').select().all();
        res.json(records.map(record => record.fields));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
