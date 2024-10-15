document.addEventListener('DOMContentLoaded', function () {
    const depositForm = document.getElementById('deposit-form');
    const withdrawForm = document.getElementById('withdraw-form');
    const balanceElement = document.getElementById('balance');
    const refreshBalanceButton = document.getElementById('refresh-balance');
    const depositMessage = document.getElementById('deposit-message');
    const withdrawMessage = document.getElementById('withdraw-message');
    const contactForm = document.getElementById('contact-form');
    const contactMessage = document.getElementById('contact-message');

    const apiUrl = 'https://api.example.com'; // Replace with your actual API URL

    // Fetch and update the account balance
    async function fetchBalance() {
        try {
            const response = await fetch(`${apiUrl}/balance`);
            const data = await response.json();
            balanceElement.textContent = `Balance: $${data.balance}`;
        } catch (error) {
            console.error('Error fetching balance:', error);
            balanceElement.textContent = 'Error fetching balance.';
        }
    }

    // Handle deposit form submission
    depositForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const amount = parseFloat(document.getElementById('amount').value);
        if (isNaN(amount) || amount <= 0) {
            depositMessage.textContent = 'Please enter a valid amount.';
            return;
        }

        try {
            const response = await fetch(`${apiUrl}/deposit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount })
            });

            if (response.ok) {
                depositMessage.textContent = 'Deposit successful!';
                fetchBalance();
            } else {
                const errorData = await response.json();
                depositMessage.textContent = `Deposit failed: ${errorData.message}`;
            }
        } catch (error) {
            console.error('Error during deposit:', error);
            depositMessage.textContent = 'Error during deposit.';
        }
    });

    // Handle withdraw form submission
    withdrawForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const amount = parseFloat(document.getElementById('withdraw-amount').value);
        if (isNaN(amount) || amount <= 0) {
            withdrawMessage.textContent = 'Please enter a valid amount.';
            return;
        }

        try {
            const response = await fetch(`${apiUrl}/withdraw`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount })
            });

            if (response.ok) {
                withdrawMessage.textContent = 'Withdrawal successful!';
                fetchBalance();
            } else {
                const errorData = await response.json();
                withdrawMessage.textContent = `Withdrawal failed: ${errorData.message}`;
            }
        } catch (error) {
            console.error('Error during withdrawal:', error);
            withdrawMessage.textContent = 'Error during withdrawal.';
        }
    });

    // Handle refresh balance button click
    refreshBalanceButton.addEventListener('click', fetchBalance);

    // Handle contact form submission
    contactForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const message = document.getElementById('message').value;

        if (!name || !email || !message) {
            contactMessage.textContent = 'Please fill out all fields.';
            return;
        }

        try {
            const response = await fetch(`${apiUrl}/contact`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, message })
            });

            if (response.ok) {
                contactMessage.textContent = 'Message sent successfully!';
                contactForm.reset();
            } else {
                const errorData = await response.json();
                contactMessage.textContent = `Error sending message: ${errorData.message}`;
            }
        } catch (error) {
            console.error('Error sending message:', error);
            contactMessage.textContent = 'Error sending message.';
        }
    });

    // Fetch initial balance
    fetchBalance();

    // Initialize Chart.js
    const ctx = document.getElementById('balance-chart').getContext('2d');
    const balanceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
            datasets: [{
                label: 'Account Balance',
                data: [400, 550, 700, 800, 1000, 1100, 1200],
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
});

