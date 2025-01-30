// Update the updateSplits function to handle manual splits correctly
function updateSplits() {
    const amount = parseFloat(document.getElementById('expenseAmount').value) || 0;
    let total = 0;
    
    // Calculate total of all splits except last participant
    participants.slice(0, -1).forEach(name => {
        const input = document.getElementById(`split-${name}`);
        // Ensure value is positive and has max 2 decimal places
        let value = parseFloat(input.value) || 0;
        if (value < 0) value = 0;
        value = parseFloat(value.toFixed(2));
        input.value = value.toFixed(2); // Format display to 2 decimal places
        total += value;
    });

    // Auto-calculate last participant's amount
    const lastParticipant = participants[participants.length - 1];
    if (lastParticipant) {
        const lastInput = document.getElementById(`split-${lastParticipant}`);
        const remainingAmount = parseFloat((amount - total).toFixed(2));
        lastInput.value = Math.max(0, remainingAmount).toFixed(2);
        
        // Validate if total matches expense amount
        const actualTotal = total + parseFloat(lastInput.value);
        if (Math.abs(actualTotal - amount) > 0.01) {
            lastInput.classList.add('negative-amount');
        } else {
            lastInput.classList.remove('negative-amount');
        }
    }
}

// Update addExpense function to validate decimal places and handle manual splits
async function addExpense() {
    const description = document.getElementById('expenseDescription').value.trim();
    const amountInput = document.getElementById('expenseAmount');
    const amount = parseFloat(amountInput.value);
    const currency = document.getElementById('currencySelect').value;
    const paidBy = document.getElementById('paidBy').value;
    const splitType = document.getElementById('splitType').value;
    const date = new Date().toISOString().split('T')[0];

    // Validation
    if (!description) {
        alert('Please enter a description');
        return;
    }
    if (!amount || amount <= 0) {
        alert('Please enter a valid amount');
        return;
    }
    // Validate decimal places
    if (amountInput.value.includes('.') && 
        amountInput.value.split('.')[1].length > 2) {
        alert('Amount can only have up to 2 decimal places');
        return;
    }
    if (!paidBy) {
        alert('Please select who paid');
        return;
    }
    if (participants.length < 2) {
        alert('Please add at least two participants');
        return;
    }

    // Calculate splits
    let splits = {};
    if (splitType === 'equal') {
        const splitAmount = amount / participants.length;
        participants.forEach(name => {
            splits[name] = parseFloat(splitAmount.toFixed(2));
        });
        
        // Fix rounding errors
        const totalSplit = Object.values(splits).reduce((sum, val) => sum + val, 0);
        if (totalSplit !== amount) {
            const firstParticipant = participants[0];
            splits[firstParticipant] += parseFloat((amount - totalSplit).toFixed(2));
        }
    } else {
        let total = 0;
        // Validate each split amount
        for (const name of participants) {
            const input = document.getElementById(`split-${name}`);
            const value = input.value;
            // Check decimal places
            if (value.includes('.') && value.split('.')[1].length > 2) {
                alert('Split amounts can only have up to 2 decimal places');
                return;
            }
            const splitAmount = parseFloat(value) || 0;
            if (splitAmount < 0) {
                alert('Split amounts cannot be negative');
                return;
            }
            splits[name] = parseFloat(splitAmount.toFixed(2));
            total += splits[name];
        }

        if (Math.abs(total - amount) > 0.01) {
            alert('Split amounts must equal the total expense amount');
            return;
        }
    }

    showLoading();
    try {
        // Create the record in Airtable
        const record = {
            Description: description,
            Amount: amount,
            Currency: currency,
            PaidBy: paidBy,
            Participants: JSON.stringify(participants),
            Splits: JSON.stringify(splits),
            Date: date
        };

        const response = await airtableService.createRecord(record);
        
        // Add to beginning of local expenses array for correct ordering
        expenses.unshift({
            id: response.records[0].id,
            description,
            amount,
            currency,
            paidBy,
            participants: [...participants],
            splits,
            date
        });

        clearExpenseForm();
        updateUI();
        alert('Expense added successfully!');
    } catch (error) {
        console.error('Error adding expense:', error);
        alert('Failed to add expense. Please try again.');
    } finally {
        hideLoading();
    }
}

// Update the updateExpensesList function to maintain input order
function updateExpensesList() {
    const list = document.getElementById('expensesList');
    
    if (!expenses || expenses.length === 0) {
        list.innerHTML = '<div class="empty-state">No expenses added yet</div>';
        return;
    }

    list.innerHTML = expenses.map(e => {
        try {
            if (!e || typeof e.amount !== 'number') {
                console.error('Invalid expense record:', e);
                return '';
            }

            const splitsDisplay = Object.entries(e.splits || {})
                .map(([name, amount]) => {
                    const splitAmount = parseFloat(amount) || 0;
                    return `<div class="split-item">
                        <span class="split-name">${name}:</span> 
                        <span class="split-amount">${getCurrencySymbol(e.currency)}${splitAmount.toFixed(2)}</span>
                    </div>`;
                })
                .join('');

            return `
                <div class="expense-item" data-expense-id="${e.id}">
                    <div class="expense-actions">
                        <button class="edit-btn" onclick="editExpense('${e.id}')">
                            <span class="material-icons">edit</span>
                        </button>
                        <button class="delete-btn" onclick="deleteExpense('${e.id}')">
                            <span class="material-icons">delete</span>
                        </button>
                    </div>
                    <div class="expense-header">
                        <strong class="expense-description">${e.description || 'No description'}</strong>
                        <span class="expense-date">${formatDate(e.date || new Date())}</span>
                    </div>
                    <div class="expense-amount">
                        ${getCurrencySymbol(e.currency)}${e.amount.toFixed(2)}
                    </div>
                    <div class="expense-paid-by">Paid by: ${e.paidBy || 'Unknown'}</div>
                    <div class="expense-splits">
                        <div class="splits-grid">${splitsDisplay}</div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error rendering expense:', error, e);
            return '';
        }
    }).join('');
}
