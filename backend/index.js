const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(express.json());

const HASURA_URL = process.env.HASURA_URL;
const HASURA_SECRET = process.env.HASURA_SECRET;
const JWT_SECRET = process.env.JWT_SECRET;

// Middleware to protect routes
const authenticate = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) return res.status(401).send('Access denied.');

    try {
        const verified = jwt.verify(token, JWT_SECRET);
        req.user = verified;
        next();
    } catch (err) {
        res.status(400).send('Invalid token.');
    }
};

// Register user
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const query = `
        mutation($username: String!, $password: String!) {
            insert_users_one(object: {username: $username, password: $password}) {
                id
            }
        }
    `;

    try {
        const response = await axios.post(HASURA_URL, {
            query,
            variables: { username, password: hashedPassword }
        }, {
            headers: { 'x-hasura-admin-secret': HASURA_SECRET }
        });

        res.send(response.data.data.insert_users_one);
    } catch (err) {
        res.status(400).send(err.response.data);
    }
});

// Login user
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    const query = `
        query($username: String!) {
            users(where: {username: {_eq: $username}}) {
                id
                password
            }
        }
    `;

    try {
        const response = await axios.post(HASURA_URL, {
            query,
            variables: { username }
        }, {
            headers: { 'x-hasura-admin-secret': HASURA_SECRET }
        });

        const user = response.data.data.users[0];
        if (!user) return res.status(400).send('User not found.');

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(400).send('Invalid password.');

        const token = jwt.sign({ id: user.id }, JWT_SECRET);
        res.send({ token });
    } catch (err) {
        res.status(400).send(err.response.data);
    }
});

// Create account
app.post('/account', authenticate, async (req, res) => {
    const userId = req.user.id;

    const query = `
        mutation($user_id: Int!) {
            insert_accounts_one(object: {user_id: $user_id}) {
                id
            }
        }
    `;

    try {
        const response = await axios.post(HASURA_URL, {
            query,
            variables: { user_id: userId }
        }, {
            headers: { 'x-hasura-admin-secret': HASURA_SECRET }
        });

        res.send(response.data.data.insert_accounts_one);
    } catch (err) {
        res.status(400).send(err.response.data);
    }
});

// Make a transaction
app.post('/transaction', authenticate, async (req, res) => {
    const userId = req.user.id;
    const { accountId, amount, type } = req.body;

    const query = `
        mutation($account_id: Int!, $amount: numeric!, $type: String!) {
            insert_transactions_one(object: {account_id: $account_id, amount: $amount, type: $type}) {
                id
            }
        }
    `;

    try {
        // Validate sufficient balance for withdrawals
        if (type === 'withdrawal') {
            const balanceQuery = `
                query($account_id: Int!) {
                    accounts_by_pk(id: $account_id) {
                        balance
                    }
                }
            `;
            const balanceResponse = await axios.post(HASURA_URL, {
                query: balanceQuery,
                variables: { account_id: accountId }
            }, {
                headers: { 'x-hasura-admin-secret': HASURA_SECRET }
            });

            const balance = balanceResponse.data.data.accounts_by_pk.balance;
            if (balance < amount) {
                return res.status(400).send('Insufficient balance.');
            }
        }

        // Insert transaction
        const response = await axios.post(HASURA_URL, {
            query,
            variables: { account_id: accountId, amount, type }
        }, {
            headers: { 'x-hasura-admin-secret': HASURA_SECRET }
        });

        // Update account balance
        const updateBalanceQuery = `
            mutation($account_id: Int!, $balance: numeric!) {
                update_accounts_by_pk(pk_columns: {id: $account_id}, _set: {balance: $balance}) {
                    id
                }
            }
        `;
        const newBalance = type === 'deposit' ? balance + amount : balance - amount;
        await axios.post(HASURA_URL, {
            query: updateBalanceQuery,
            variables: { account_id: accountId, balance: newBalance }
        }, {
            headers: { 'x-hasura-admin-secret': HASURA_SECRET }
        });

        res.send(response.data.data.insert_transactions_one);
    } catch (err) {
        res.status(400).send(err.response.data);
    }
});

// Fetch transaction history
app.get('/transactions', authenticate, async (req, res) => {
    const userId = req.user.id;

    const query = `
        query($user_id: Int!) {
            accounts(where: {user_id: {_eq: $user_id}}) {
                id
                transactions {
                    id
                    amount
                    type
                    created_at
                }
            }
        }
    `;

    try {
        const response = await axios.post(HASURA_URL, {
            query,
            variables: { user_id: userId }
        }, {
            headers: { 'x-hasura-admin-secret': HASURA_SECRET }
        });

        res.send(response.data.data.accounts);
    } catch (err) {
        res.status(400).send(err.response.data);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
