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
            <div class="loading-state">
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

    messagesContainer.innerHTML = '';

    data.forEach(message => {

        const card = document.createElement('article');

        card.className = 'message-card';

        card.innerHTML = `
            <div class="message-header">

                <div>
                    <h3>${escapeHTML(message.name)}</h3>
                    <a href="mailto:${escapeHTML(message.email)}">
                        ${escapeHTML(message.email)}
                    </a>
                </div>

                <time>
                    ${formatDate(message.created_at)}
                </time>

            </div>

            ${
                message.subject
                    ? `<h4>${escapeHTML(message.subject)}</h4>`
                    : ''
            }

            <p class="message-body">
                ${escapeHTML(message.message)}
            </p>

        `;

        messagesContainer.appendChild(card);
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