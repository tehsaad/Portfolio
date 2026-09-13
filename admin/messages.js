const SUPABASE_URL = 'https://myfcyubdhxzthhdgustu.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
    'sb_publishable_Wjqf-ZZtYTcovUi7k469SQ_ihmUsqzu';

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);


// =========================================================
// ELEMENTS
// =========================================================

const adminEmail = document.getElementById('adminEmail');
const logoutButton = document.getElementById('logoutButton');
const messagesContainer = document.getElementById('messagesContainer');
const messageCount = document.getElementById('messageCount');


// =========================================================
// CHECK ADMIN SESSION
// =========================================================

async function checkSession() {

    const {
        data: { session },
        error
    } = await supabaseClient.auth.getSession();

    if (error || !session) {
        window.location.href = 'login.html';
        return null;
    }

    adminEmail.textContent = session.user.email;

    return session;
}


// =========================================================
// LOAD MESSAGES
// =========================================================

async function loadMessages() {

    messagesContainer.innerHTML = `
        <div class="loading-state">
            Loading messages...
        </div>
    `;

    const { data, error } = await supabaseClient
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Supabase error:', error);

        messagesContainer.innerHTML = `
            <div class="loading-state error-state">
                Unable to load messages.
            </div>
        `;

        return;
    }

    messageCount.textContent = data.length;

    if (data.length === 0) {

        messagesContainer.innerHTML = `
            <div class="loading-state">
                No messages yet.
            </div>
        `;

        return;
    }

    messagesContainer.innerHTML = `
        <div class="messages-table-wrapper">

            <table class="messages-table">

                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Subject</th>
                        <th>Message</th>
                        <th>Date</th>
                    </tr>
                </thead>

                <tbody id="messagesTableBody"></tbody>

            </table>

        </div>
    `;

    const tableBody = document.getElementById('messagesTableBody');

    data.forEach(message => {

        const row = document.createElement('tr');

        row.innerHTML = `
            <td>
                <div class="message-name">
                    ${escapeHTML(message.name)}
                </div>
            </td>

            <td>
                <a
                    class="message-email"
                    href="mailto:${escapeHTML(message.email)}"
                >
                    ${escapeHTML(message.email)}
                </a>
            </td>

            <td>
                <span class="message-subject">
                    ${escapeHTML(message.subject || 'No subject')}
                </span>
            </td>

            <td>
                <div class="message-preview">
                    ${escapeHTML(message.message)}
                </div>
            </td>

            <td>
                <time class="message-date">
                    ${formatDate(message.created_at)}
                </time>
            </td>
        `;

        tableBody.appendChild(row);
    });
}

// =========================================================
// HTML ESCAPE
// =========================================================

function escapeHTML(value) {

    if (value === null || value === undefined) {
        return '';
    }

    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}


// =========================================================
// DATE FORMAT
// =========================================================

function formatDate(dateString) {

    if (!dateString) {
        return '';
    }

    const date = new Date(dateString);

    return date.toLocaleString([], {
        dateStyle: 'medium',
        timeStyle: 'short'
    });
}


// =========================================================
// LOGOUT
// =========================================================

logoutButton.addEventListener('click', async () => {

    logoutButton.disabled = true;
    logoutButton.textContent = 'Signing Out...';

    const { error } = await supabaseClient.auth.signOut();

    if (error) {

        console.error('Logout error:', error);

        logoutButton.disabled = false;
        logoutButton.textContent = 'Sign Out';

        return;
    }

    window.location.href = 'login.html';
});


// =========================================================
// INITIALIZE
// =========================================================

async function init() {

    const session = await checkSession();

    if (!session) {
        return;
    }

    await loadMessages();
}

init();