
// ===== SUPABASE GLOBAL INIT =====
const SUPABASE_URL = "https://mxzvutawnrnswxdlwzjo.supabase.co";
const SUPABASE_KEY = "sb_publishable_EPOu_YCdKfRNrgcKnqFeHA_9jRQFLYg";

const supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// GLOBAL session helper
async function getSession() {
    const { data } = await supabase.auth.getSession();
    return data.session;
}



// ===== HOME PAGE LOGIC =====

const isHomePage =
    window.location.pathname === "/" ||
    window.location.pathname === "/index.html";

if (isHomePage) {
    console.log("home page");
    initHomePage();
}

async function initHomePage() {
    const authGate = document.getElementById("auth-gate");
    const jarArea = document.getElementById("jar-area");
    const displayNameEl = document.getElementById("display-name");
    const messageCountEl = document.getElementById("message-count");
    const messagesList = document.getElementById("messages-list");
    const copyBtn = document.getElementById("copy-link-btn");
    const introCard = document.getElementById("intro-card");

    const popup = document.getElementById("popup");
    const popupContent = document.getElementById("popup-content");
    const closePopup = document.getElementById("close-popup");

    const session = await getSession();


    // GİRİŞ YOK
    if (!session) {
        authGate.classList.remove("hidden");
        jarArea.classList.add("hidden");
        introCard.classList.remove("hidden");
        return;
    }


    // GİRİŞ VAR
    authGate.classList.add("hidden");
    jarArea.classList.remove("hidden");
    introCard.classList.add("hidden");
    const userId = session.user.id;

    // GET PROFILE
    const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", userId)
        .single();


    displayNameEl.textContent = profile.display_name;

    // COPY SEND LINK
    copyBtn.addEventListener("click", () => {
        const link = `${window.location.origin}/send.html?to=${userId}`;
        navigator.clipboard.writeText(link);
        showPopupMessage("Kavanoz linkin kopyalandı! Linki arkadaşlarınla paylaşıp yılbaşı mesajları toplayabilirsin 🎉");
    });

    // GET MESSAGES
    const { data: messages } = await supabase
        .from("messages")
        .select("id, sender_name, created_at")
        .eq("receiver_id", userId)
        .order("created_at", { ascending: false });


    messageCountEl.textContent = messages.length;
    
    // Buraya kadar geldiysen söyleyeyim. Çok heyecanlı bir vatandaşsan yazdığım kodu inceleyebilirsin, değiştirebilirsin ve hatta başarabilirsen yılbaşı olmadan mesajları açabilirsin. 
    // Başkasının mesajlarını okumayı engelledim, onu deneme bile.
    const unlocked =
        new Date() >= new Date("2026-01-01T00:00:00");

    messagesList.innerHTML = "";

    messages.forEach((msg) => {
        const div = document.createElement("div");
        div.className = "p-3 border cursor-pointer";

        div.innerHTML = `
      <p>Kimden: <b>${msg.sender_name}</b></p>
      <p class="text-sm">${new Date(msg.created_at).toLocaleString()}</p>
    `;

        div.addEventListener("click", async () => {
            if (!unlocked) {
                showPopupMessage("Bu mesaj yılbaşına kadar kilitli! 🎄 Sabret, az kaldı!");
                return;
            }

            const { data: fullMessage } = await supabase
                .from("messages")
                .select("content")
                .eq("id", msg.id)
                .single();

            popupContent.textContent = fullMessage.content;
            popup.classList.remove("hidden");
        });

        messagesList.appendChild(div);
    });


    closePopup.addEventListener("click", () => {
        popup.classList.add("hidden");
    });


    // ÇIKIŞ
    const logoutBtn = document.getElementById("logout-btn");

    logoutBtn.addEventListener("click", async () => {
        const { error } = await supabase.auth.signOut();

        if (error) {
            showPopupMessage("Çıkış yapılamadı 😤");
            console.error(error);
            return;
        }

        // UI reset + redirect
        authGate.classList.remove("hidden");
        jarArea.classList.add("hidden");

        window.location.href = "/auth.html";
    });


    function showPopupMessage(message) {
        popupContent.textContent = message;
        popup.classList.remove("hidden");
    }


}


// ===== SEND PAGE LOGIC =====

const isSendPage =
    window.location.pathname === "/send" ||
    window.location.pathname === "/send.html";

if (isSendPage) {
    console.log("send page");
    initSendPage();
}

async function initSendPage() {
    const params = new URLSearchParams(window.location.search);
    const receiverId = params.get("to");

    const receiverBox = document.getElementById("receiver-box");
    const receiverNameEl = document.getElementById("receiver-name");
    const errorBox = document.getElementById("error-box");
    const form = document.getElementById("send-form");
    const successBox = document.getElementById("success-box");


    if (!receiverId) {
        showError("Alıcı bulunamadı.");
        return;
    }

    // Fetch receiver profile
    const { data: profile, error } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", receiverId)
        .single();


    if (error || !profile) {
        showError("Kullanıcı bulunamadı.");
        return;
    }

    receiverBox.classList.remove("hidden");
    receiverNameEl.textContent = profile.display_name;
    form.classList.remove("hidden");


    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const senderName = document.getElementById("sender-name").value.trim();
        const content = document.getElementById("message-content").value.trim();

        if (!senderName || !content) {
            showError("Tüm alanları doldurmalısın!");
            return;
        }

        const { error: insertError } = await supabase.from("messages").insert([
            {
                receiver_id: receiverId,
                sender_name: senderName,
                content: content
            }
        ]);

        if (insertError) {
            showError(insertError.message);
            return;
        }

        form.classList.add("hidden");
        successBox.classList.remove("hidden");
    });

    function showError(msg) {
        errorBox.textContent = msg;
        errorBox.classList.remove("hidden");
    }
}

// ===== AUTH PAGE LOGIC =====

const isAuthPage =
    window.location.pathname === "/auth" ||
    window.location.pathname === "/auth.html";

if (isAuthPage) {
    console.log("auth page");
    initAuthPage();
}

function initAuthPage() {
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");
    const errorDiv = document.getElementById("auth-error");


    // GİRİŞ
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            errorDiv?.classList.add("hidden");

            const email = loginForm.email.value;
            const password = loginForm.password.value;

            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                showError("Giriş başarısız: " + error.message);
            } else {
                window.location.href = "/";
            }
        });
    }


    // KAYIT
    if (registerForm) {
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            errorDiv?.classList.add("hidden");

            const email = registerForm.email.value;
            const password = registerForm.password.value;
            const display_name = registerForm.display_name.value;

            const { data, error } = await supabase.auth.signUp({
                email,
                password,
            });

            if (error) {
                showError("Kayıt başarısız: " + error.message);
                return;
            }

            const user = data.user;

            if (user) {
                const { error: profileError } = await supabase
                    .from("profiles")
                    .insert([{ id: user.id, display_name }]);

                if (profileError) {
                    showError("Profil oluşturulamadı: " + profileError.message);
                    return;
                }
            }

            window.location.href = "/";
        });
    }

    function showError(msg) {
        if (!errorDiv) return;
        errorDiv.textContent = msg;
        errorDiv.classList.remove("hidden");
    }
}