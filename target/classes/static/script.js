/**
 * SMART RECIPE PLANNER & MEAL ORGANIZER
 * Frontend Application Controller
 */

const RECIPES_API = '/api/recipes';
const PLANS_API = '/api/plans';

let recipes = [];
let weeklyPlans = [];

let timerInterval = null;
let timerSeconds = 0;
let currentRecipePrepTime = 0;
let currentSpeakingBtn = null;

// =============================================================================
// INITIALIZATION
// =============================================================================

document.addEventListener("DOMContentLoaded", () => {
    initAuthStatus();
    fetchRecipes();
    fetchPlans();

    // Support pressing Enter key in ingredient finder
    const ingInput = document.getElementById("findIngredientsInput");
    if (ingInput) {
        ingInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                generateFromDatabase();
            }
        });
    }

    // Modal backdrop click-to-close listener
    const modal = document.getElementById("cookingModal");
    if (modal) {
        modal.addEventListener("click", (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }

    // Global keyboard listener for Escape key to dismiss modal
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            const cookingModal = document.getElementById("cookingModal");
            if (cookingModal && cookingModal.style.display === "flex") {
                closeModal();
            }
        }
    });
});

// =============================================================================
// TOAST NOTIFICATIONS
// =============================================================================

function showToast(message, type = 'info') {
    let toast = document.getElementById('toastNotification');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toastNotification';
        toast.className = 'toast-notification';
        document.body.appendChild(toast);
    }

    let iconName = 'info';
    if (type === 'success') iconName = 'check_circle';
    if (type === 'error') iconName = 'error';

    toast.innerHTML = `<span class="material-symbols-outlined" aria-hidden="true">${iconName}</span> <span>${escapeHtml(message)}</span>`;
    toast.className = `toast-notification show ${type}`;

    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => {
        toast.className = 'toast-notification';
    }, 2800);
}

// =============================================================================
// AUTHENTICATION STATE & NAVIGATION
// =============================================================================

function initAuthStatus() {
    const authNav = document.getElementById("authNavArea");
    if (!authNav) return;

    try {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            const userData = JSON.parse(storedUser);
            const displayName = userData.username || 'User';
            const displayEmail = userData.email || '';
            authNav.innerHTML = `
                <div class="user-profile-badge" title="${escapeHtml(displayName)} ${displayEmail ? '(' + escapeHtml(displayEmail) + ')' : ''}">
                    <span class="material-symbols-outlined" style="color:#4285F4; font-size:1.15rem;" aria-hidden="true">account_circle</span>
                    <span class="user-name-display">${escapeHtml(displayName)}</span>
                </div>
                <button type="button" onclick="handleLogout()" class="auth-nav-link" aria-label="Sign out of account" title="Sign Out">
                    <span class="material-symbols-outlined" aria-hidden="true">logout</span>
                    <span>Sign Out</span>
                </button>
            `;
        } else {
            authNav.innerHTML = `
                <a href="login.html" class="auth-nav-link" aria-label="Sign in to your account">
                    <span class="material-symbols-outlined" aria-hidden="true">login</span>
                    <span>Sign In</span>
                </a>
            `;
        }
    } catch (e) {
        console.error("Auth state parse error:", e);
    }
}

function handleLogout() {
    localStorage.removeItem("user");
    initAuthStatus();
    showToast("Signed out successfully.", "info");
}

// =============================================================================
// TAB NAVIGATION
// =============================================================================

function switchTab(tab, event) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));

    if (event) {
        event.currentTarget.classList.add('active');
    } else {
        const tabBtns = document.querySelectorAll('.tab-btn');
        if (tab === 'recipes') tabBtns[0]?.classList.add('active');
        if (tab === 'planner') tabBtns[1]?.classList.add('active');
        if (tab === 'shopping') tabBtns[2]?.classList.add('active');
    }

    const targetView = document.getElementById(`${tab}-view`);
    if (targetView) targetView.classList.add('active');

    if (tab === 'planner') renderPlanner();
    if (tab === 'shopping') generateShoppingList();
}

// =============================================================================
// RECIPES (FETCH, SAVE, FILTER, DELETE)
// =============================================================================

async function fetchRecipes() {
    try {
        const response = await fetch(RECIPES_API);
        if (response.ok) {
            recipes = await response.json();
            renderRecipes(recipes);
            populatePlanSelect();
        } else {
            console.error("Failed to fetch recipes, status:", response.status);
        }
    } catch (error) {
        console.error("Error fetching recipes:", error);
    }
}

// Populate Planner Recipe selection dropdown independently from filter state
function populatePlanSelect() {
    const selectPlan = document.getElementById("planRecipe");
    if (!selectPlan) return;

    const currentVal = selectPlan.value;
    selectPlan.innerHTML = '<option value="" disabled selected>Select Recipe for Schedule</option>';

    recipes.forEach(r => {
        const selected = (currentVal && String(r.id) === String(currentVal)) ? 'selected' : '';
        selectPlan.innerHTML += `<option value="${r.id}" ${selected}>${escapeHtml(r.name)} (${escapeHtml(r.mealType || 'Meal')})</option>`;
    });
}

// Handle Add Recipe form submission
document.getElementById("recipeForm").addEventListener("submit", async function(e) {
    e.preventDefault();

    const rawPrepTime = parseInt(document.getElementById("prepTime").value, 10);
    if (isNaN(rawPrepTime) || rawPrepTime <= 0) {
        showToast("Prep time must be a valid number greater than 0!", "error");
        return;
    }

    const rawCalories = parseInt(document.getElementById("calories").value, 10);
    if (isNaN(rawCalories) || rawCalories <= 0) {
        showToast("Calories must be a valid number greater than 0!", "error");
        return;
    }

    const newRecipe = {
        name: document.getElementById("recipeName").value.trim(),
        dietPref: document.getElementById("dietPref").value,
        cuisine: document.getElementById("cuisine").value.trim(),
        prepTime: rawPrepTime,
        mealType: document.getElementById("mealType").value,
        calories: rawCalories,
        macros: document.getElementById("macros").value.trim() || "N/A",
        ingredients: document.getElementById("ingredients").value.trim(),
        instructions: document.getElementById("instructions").value.trim()
    };

    try {
        const response = await fetch(RECIPES_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newRecipe)
        });

        if (response.ok) {
            this.reset();
            showToast("Recipe saved successfully!", "success");
            await fetchRecipes();
        } else {
            const data = await response.json();
            showToast(data.message || "Failed to save recipe.", "error");
        }
    } catch (error) {
        console.error("Error saving recipe:", error);
        showToast("Network error while saving recipe.", "error");
    }
});

// Render Recipe cards
function renderRecipes(list = recipes) {
    const grid = document.getElementById("recipeCards");
    const countBadge = document.getElementById("recipeCountBadge");

    if (countBadge) {
        countBadge.innerHTML = `<span class="material-symbols-outlined" aria-hidden="true">menu_book</span> ${list.length} ${list.length === 1 ? 'Recipe' : 'Recipes'}`;
    }

    if (!grid) return;
    grid.innerHTML = "";

    if (list.length === 0) {
        grid.innerHTML = `<p style="color:var(--text-muted); grid-column: 1/-1; text-align: center; padding: 40px 0; font-size: 0.95rem;">No recipes match the search or filter criteria. Add a new recipe above or clear filters.</p>`;
        return;
    }

    list.forEach(r => {
        grid.innerHTML += `
            <div class="recipe-card" id="recipe-card-${r.id}">
                <div class="recipe-card-header">
                    <span class="cuisine-tag"><span class="material-symbols-outlined" aria-hidden="true">restaurant</span> ${escapeHtml(r.cuisine || 'Classic')}</span>
                    <span class="meal-tag">${escapeHtml(r.mealType || 'Meal')}</span>
                </div>
                <div class="recipe-content">
                    <h3 class="recipe-title">${escapeHtml(r.name)}</h3>
                    <div class="badges-row">
                        <span class="badge badge-diet">${escapeHtml(r.dietPref || 'Veg')}</span>
                        <span class="badge badge-time"><span class="material-symbols-outlined" aria-hidden="true">schedule</span> ${r.prepTime || 0} min</span>
                        <span class="badge badge-cal"><span class="material-symbols-outlined" aria-hidden="true">local_fire_department</span> ${r.calories || 0} kcal</span>
                    </div>
                    <div class="recipe-macros">
                        <strong>Macros:</strong> ${escapeHtml(r.macros || 'P: N/A, C: N/A, F: N/A')}
                    </div>
                    <p class="recipe-ingredients-preview">
                        <strong>Ingredients:</strong> ${escapeHtml(r.ingredients)}
                    </p>
                    <div class="recipe-actions">
                        <button type="button" class="btn-submit btn-primary" style="padding: 9px 18px; font-size: 0.86rem; flex: 1;" onclick="openCookMode(${r.id})">
                            <span class="material-symbols-outlined" aria-hidden="true">skillet</span> <span>Start Cooking</span>
                        </button>
                        <button type="button" class="btn-submit btn-secondary btn-sm" aria-label="View Recipe Details for ${escapeHtml(r.name)}" title="Highlight Recipe" onclick="navigateToRecipe(${r.id})">
                            <span class="material-symbols-outlined" aria-hidden="true">visibility</span>
                        </button>
                        <button type="button" class="btn-submit btn-danger btn-sm" aria-label="Delete Recipe ${escapeHtml(r.name)}" title="Delete Recipe" onclick="deleteRecipe(${r.id})">
                            <span class="material-symbols-outlined" aria-hidden="true">delete</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
}

// Navigate to and highlight a recipe card
function navigateToRecipe(recipeId) {
    switchTab('recipes');

    setTimeout(() => {
        const card = document.getElementById(`recipe-card-${recipeId}`);
        if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });

            card.style.transition = "all 0.3s ease";
            card.style.borderColor = "var(--btn-primary-bg)";
            card.style.boxShadow = "0 0 0 4px rgba(255, 107, 0, 0.25)";

            setTimeout(() => {
                card.style.borderColor = "var(--border-subtle)";
                card.style.boxShadow = "var(--shadow-card)";
            }, 2500);
        }
    }, 100);
}

// Filter recipes by Name, Cuisine, Ingredients, and Dietary Preference
function filterRecipes() {
    const searchInput = document.getElementById("searchInput");
    const dietSelect = document.getElementById("filterDiet");
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const diet = dietSelect ? dietSelect.value : 'All';

    const filtered = recipes.filter(r => {
        const matchesName = r.name && r.name.toLowerCase().includes(query);
        const matchesCuisine = r.cuisine && r.cuisine.toLowerCase().includes(query);
        const matchesIngredients = r.ingredients && r.ingredients.toLowerCase().includes(query);
        const matchesDiet = (diet === "All") || (r.dietPref === diet);
        return (!query || matchesName || matchesCuisine || matchesIngredients) && matchesDiet;
    });

    renderRecipes(filtered);
}

// Delete recipe and its references
async function deleteRecipe(id) {
    if (!confirm("Are you sure you want to delete this recipe? Associated scheduled meals will also be removed.")) return;

    try {
        const response = await fetch(`${RECIPES_API}/${id}`, { method: 'DELETE' });
        if (response.ok) {
            showToast("Recipe deleted successfully.", "info");
            await fetchRecipes();
            await fetchPlans();
        } else {
            showToast("Failed to delete recipe.", "error");
        }
    } catch (error) {
        console.error("Error deleting recipe:", error);
        showToast("Network error while deleting recipe.", "error");
    }
}

// =============================================================================
// COOKING MODE & STEP AUDIO
// =============================================================================

function openCookMode(id) {
    const r = recipes.find(x => x.id === id);
    if (!r) return;

    document.getElementById("modalRecipeTitle").innerHTML = `
        <span class="material-symbols-outlined" style="color: var(--btn-primary-bg);" aria-hidden="true">skillet</span>
        <span>${escapeHtml(r.name)}</span>
    `;

    currentRecipePrepTime = (r.prepTime && r.prepTime > 0 ? r.prepTime : 10) * 60;
    timerSeconds = currentRecipePrepTime;
    updateTimerDisplay();

    const timerBtn = document.getElementById("timerToggleBtn");
    if (timerBtn) {
        timerBtn.innerHTML = '<span class="material-symbols-outlined" id="timerToggleIcon" aria-hidden="true">play_arrow</span> <span id="timerToggleText">Start Timer</span>';
    }

    const stepsContainer = document.getElementById("modalSteps");

    // Intelligent step parsing: handles newlines, numbered lists, and period-separated sentences
    let steps = [];
    if (r.instructions) {
        if (r.instructions.includes('\n')) {
            steps = r.instructions.split(/\r?\n/).map(s => s.replace(/^\d+[\.\)]\s*/, '').trim()).filter(Boolean);
        } else {
            steps = r.instructions.split(/(?<=[a-zA-Z\)])\.\s+/).map(s => s.trim().replace(/\.$/, '')).filter(Boolean);
        }
    }

    if (steps.length === 0) {
        stepsContainer.innerHTML = `<p style="color:var(--text-muted); padding:10px 0;">No instructions recorded for this recipe.</p>`;
    } else {
        stepsContainer.innerHTML = steps.map((step, idx) => {
            const encodedStep = encodeURIComponent(step);
            return `
                <div class="step-item">
                    <span><strong>Step ${idx+1}:</strong> ${escapeHtml(step)}</span>
                    <button type="button" class="btn-submit btn-secondary btn-sm" style="white-space:nowrap;" data-step="${encodedStep}" onclick="toggleSpeakStep(decodeURIComponent(this.dataset.step), this)">
                        <span class="material-symbols-outlined" aria-hidden="true">volume_up</span> <span>Listen</span>
                    </button>
                </div>
            `;
        }).join('');
    }

    document.getElementById("cookingModal").style.display = "flex";
}

function closeModal() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    stopSpeech();
    document.getElementById("cookingModal").style.display = "none";
}

function stopSpeech() {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    if (currentSpeakingBtn) {
        currentSpeakingBtn.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">volume_up</span> <span>Listen</span>';
        currentSpeakingBtn = null;
    }
}

function toggleSpeakStep(text, btn) {
    if (!('speechSynthesis' in window)) {
        showToast("Text-to-speech is not supported by your browser.", "error");
        return;
    }

    if (window.speechSynthesis.speaking && currentSpeakingBtn === btn) {
        stopSpeech();
        return;
    }

    stopSpeech();

    try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        utterance.pitch = 1.0;

        currentSpeakingBtn = btn;
        if (btn) {
            btn.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">volume_off</span> <span>Stop Speech</span>';
        }

        utterance.onend = () => {
            if (currentSpeakingBtn === btn && btn) {
                btn.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">volume_up</span> <span>Listen</span>';
                currentSpeakingBtn = null;
            }
        };

        utterance.onerror = (e) => {
            console.warn("Speech playback error:", e);
            if (currentSpeakingBtn === btn && btn) {
                btn.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">volume_up</span> <span>Listen</span>';
                currentSpeakingBtn = null;
            }
        };

        window.speechSynthesis.speak(utterance);
    } catch (e) {
        console.error("Speech playback error:", e);
        stopSpeech();
    }
}

// =============================================================================
// TIMER CONTROLS
// =============================================================================

function updateTimerDisplay() {
    const mins = Math.floor(timerSeconds / 60);
    const secs = timerSeconds % 60;
    const display = document.getElementById("timerDisplay");
    if (display) {
        display.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
}

function toggleTimer() {
    if (timerInterval) {
        pauseTimer();
    } else {
        startTimer();
    }
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    const timerBtn = document.getElementById("timerToggleBtn");
    if (timerBtn) {
        timerBtn.innerHTML = '<span class="material-symbols-outlined" id="timerToggleIcon" aria-hidden="true">pause</span> <span id="timerToggleText">Pause Timer</span>';
    }
    timerInterval = setInterval(() => {
        if (timerSeconds > 0) {
            timerSeconds--;
            updateTimerDisplay();
        } else {
            clearInterval(timerInterval);
            timerInterval = null;
            if (timerBtn) {
                timerBtn.innerHTML = '<span class="material-symbols-outlined" id="timerToggleIcon" aria-hidden="true">play_arrow</span> <span id="timerToggleText">Start Timer</span>';
            }
            showToast("Cooking Timer Complete!", "success");
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification("Smart Recipe Planner", { body: "Cooking timer has finished!" });
            }
        }
    }, 1000);
}

function pauseTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    const timerBtn = document.getElementById("timerToggleBtn");
    if (timerBtn) {
        timerBtn.innerHTML = '<span class="material-symbols-outlined" id="timerToggleIcon" aria-hidden="true">play_arrow</span> <span id="timerToggleText">Resume Timer</span>';
    }
}

function resetTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    timerSeconds = currentRecipePrepTime || 0;
    updateTimerDisplay();
    const timerBtn = document.getElementById("timerToggleBtn");
    if (timerBtn) {
        timerBtn.innerHTML = '<span class="material-symbols-outlined" id="timerToggleIcon" aria-hidden="true">play_arrow</span> <span id="timerToggleText">Start Timer</span>';
    }
}

// =============================================================================
// WEEKLY MEAL PLANNER
// =============================================================================

async function fetchPlans() {
    try {
        const response = await fetch(PLANS_API);
        if (response.ok) {
            weeklyPlans = await response.json();
            renderPlanner();
        } else {
            console.error("Failed to fetch plans, status:", response.status);
        }
    } catch (error) {
        console.error("Error fetching plans:", error);
    }
}

async function addToPlan() {
    const day = document.getElementById("planDay").value;
    const recipeSelect = document.getElementById("planRecipe");
    const recipeId = parseInt(recipeSelect.value, 10);

    if (!recipeId || isNaN(recipeId)) {
        showToast("Please select a recipe first!", "error");
        return;
    }

    try {
        const response = await fetch(PLANS_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ day, recipeId })
        });

        if (response.ok) {
            showToast(`Added meal to ${day}!`, "success");
            await fetchPlans();
        } else {
            const data = await response.json();
            showToast(data.message || "Failed to schedule meal.", "error");
        }
    } catch (error) {
        console.error("Error adding plan:", error);
        showToast("Network error while scheduling meal.", "error");
    }
}

function renderPlanner() {
    const calendar = document.getElementById("weeklyCalendar");
    if (!calendar) return;

    calendar.innerHTML = "";
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

    days.forEach(day => {
        const dayPlans = weeklyPlans.filter(p => p.day === day);

        let itemsHtml = dayPlans.map(p => {
            const recipe = recipes.find(r => r.id === p.recipeId);
            const recipeName = recipe ? recipe.name : `Recipe #${p.recipeId}`;
            const mealType = recipe ? recipe.mealType || 'Meal' : 'Meal';

            return `
                <div class="planned-item" style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="cursor: pointer;" onclick="navigateToRecipe(${p.recipeId})" title="Click to view recipe details">
                        <span class="material-symbols-outlined" aria-hidden="true" style="color:var(--btn-primary-bg); font-size:1rem; margin-right:4px;">restaurant</span>
                        <strong>${escapeHtml(mealType)}:</strong> <span class="planned-item-link">${escapeHtml(recipeName)}</span>
                    </div>
                    <button type="button" class="plan-remove-btn" aria-label="Remove ${escapeHtml(recipeName)} from ${day}" title="Remove scheduled meal" onclick="removeFromPlan(${p.id})">
                        <span class="material-symbols-outlined" aria-hidden="true">close</span>
                    </button>
                </div>
            `;
        }).join('');

        calendar.innerHTML += `
            <div class="day-column">
                <h3>${day}</h3>
                ${itemsHtml || '<p style="font-size:0.8rem; color:var(--text-muted); text-align:center; padding-top:20px;">No meals planned</p>'}
            </div>
        `;
    });
}

async function removeFromPlan(id) {
    try {
        const response = await fetch(`${PLANS_API}/${id}`, { method: 'DELETE' });
        if (response.ok) {
            showToast("Meal removed from schedule.", "info");
            await fetchPlans();
        } else {
            console.error("Failed to remove plan item:", response.status);
            showToast("Failed to remove scheduled meal.", "error");
        }
    } catch (error) {
        console.error("Error removing plan:", error);
        showToast("Network error removing meal.", "error");
    }
}

async function clearFullPlan() {
    if (confirm("Are you sure you want to clear the entire weekly meal schedule?")) {
        try {
            const response = await fetch(`${PLANS_API}/clear`, { method: 'DELETE' });
            if (response.ok) {
                showToast("Weekly schedule cleared.", "info");
                await fetchPlans();
            } else {
                showToast("Failed to clear meal schedule.", "error");
            }
        } catch (error) {
            console.error("Error clearing plans:", error);
            showToast("Network error clearing schedule.", "error");
        }
    }
}

// =============================================================================
// AUTOMATED SHOPPING LIST
// =============================================================================

function generateShoppingList() {
    const listContainer = document.getElementById("shoppingList");
    if (!listContainer) return;

    listContainer.innerHTML = "";

    if (weeklyPlans.length === 0) {
        listContainer.innerHTML = `<li style="color: var(--text-muted); list-style: none; padding: 20px 0; text-align: center;">No meals assigned in weekly planner. Please add recipes to the planner tab first!</li>`;
        return;
    }

    const recipeMap = {};

    weeklyPlans.forEach(plan => {
        const recipe = recipes.find(r => r.id === plan.recipeId);
        if (recipe && recipe.ingredients) {
            if (!recipeMap[recipe.name]) {
                recipeMap[recipe.name] = new Set();
            }

            recipe.ingredients.split(',').forEach(ing => {
                let cleaned = ing.trim().replace(/\.$/, '');
                if (cleaned) {
                    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
                    recipeMap[recipe.name].add(cleaned);
                }
            });
        }
    });

    const recipeNames = Object.keys(recipeMap);

    if (recipeNames.length === 0) {
        listContainer.innerHTML = `<li style="color: var(--text-muted); list-style: none; padding: 20px 0; text-align: center;">No ingredients found in the scheduled recipes.</li>`;
        return;
    }

    recipeNames.forEach(recipeName => {
        const ingredientsList = Array.from(recipeMap[recipeName]);

        if (ingredientsList.length > 0) {
            const recipeSection = document.createElement("div");
            recipeSection.className = "recipe-shopping-block";
            recipeSection.dataset.recipeName = recipeName;

            let itemsHtml = ingredientsList.map(item => `
                <li>
                    <input type="checkbox" onchange="toggleItemStrike(this)" aria-label="${escapeHtml(item)}">
                    <span class="ingredient-item-text" style="transition: all 0.2s;">${escapeHtml(item)}</span>
                </li>
            `).join('');

            const encodedName = encodeURIComponent(recipeName);

            recipeSection.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 8px;">
                    <h4 class="recipe-block-title">
                        <span class="material-symbols-outlined" aria-hidden="true">menu_book</span> ${escapeHtml(recipeName)}
                    </h4>
                    <div style="display: flex; gap: 8px;">
                        <button type="button" class="btn-submit btn-whatsapp btn-sm" data-recipe="${encodedName}" onclick="shareParticularRecipe(decodeURIComponent(this.dataset.recipe))" title="Share via WhatsApp" aria-label="Share ${escapeHtml(recipeName)} via WhatsApp">
                            <span class="material-symbols-outlined" aria-hidden="true">share</span> <span>WhatsApp</span>
                        </button>
                        <button type="button" class="btn-submit btn-secondary btn-sm" data-recipe="${encodedName}" onclick="copyParticularRecipe(decodeURIComponent(this.dataset.recipe))" title="Copy to clipboard" aria-label="Copy ${escapeHtml(recipeName)} ingredients">
                            <span class="material-symbols-outlined" aria-hidden="true">content_copy</span> <span>Copy</span>
                        </button>
                        <button type="button" class="btn-submit btn-secondary btn-sm" data-recipe="${encodedName}" onclick="downloadParticularTxt(decodeURIComponent(this.dataset.recipe))" title="Download text file" aria-label="Download ${escapeHtml(recipeName)} ingredients as text">
                            <span class="material-symbols-outlined" aria-hidden="true">download</span> <span>TXT</span>
                        </button>
                    </div>
                </div>
                <ul class="recipe-items-list" style="list-style: none; padding-left: 0;">
                    ${itemsHtml}
                </ul>
            `;

            listContainer.appendChild(recipeSection);
        }
    });
}

function toggleItemStrike(checkbox) {
    const spanText = checkbox.nextElementSibling;
    if (!spanText) return;

    if (checkbox.checked) {
        spanText.style.textDecoration = "line-through";
        spanText.style.opacity = "0.45";
    } else {
        spanText.style.textDecoration = "none";
        spanText.style.opacity = "1";
    }
}

function getParticularRecipeText(recipeName) {
    let text = `Ingredients for ${recipeName}:\n\n`;
    let found = false;

    document.querySelectorAll(".recipe-shopping-block").forEach(block => {
        if (block.dataset.recipeName === recipeName) {
            found = true;
            block.querySelectorAll(".ingredient-item-text").forEach(item => {
                text += `• ${item.innerText}\n`;
            });
        }
    });

    return found ? text : null;
}

function shareParticularRecipe(recipeName) {
    const text = getParticularRecipeText(recipeName);
    if (!text) {
        showToast(`No ingredients found for ${recipeName}.`, "info");
        return;
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
}

function copyParticularRecipe(recipeName) {
    const text = getParticularRecipeText(recipeName);
    if (!text) {
        showToast(`No ingredients found for ${recipeName}.`, "info");
        return;
    }
    navigator.clipboard.writeText(text).then(() => {
        showToast(`Shopping list for "${recipeName}" copied!`, "success");
    }).catch(() => {
        showToast("Clipboard copy failed. Please grant permission.", "error");
    });
}

function downloadParticularTxt(recipeName) {
    const text = getParticularRecipeText(recipeName);
    if (!text) {
        showToast(`No ingredients found for ${recipeName}.`, "info");
        return;
    }
    const blob = new Blob([text], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${recipeName.replace(/[^a-zA-Z0-9_-]/g, '_')}_Shopping_List.txt`;
    a.click();
    showToast(`Downloaded ${recipeName} shopping list.`, "info");
}

function getFullShoppingListText() {
    const blocks = document.querySelectorAll(".recipe-shopping-block");
    if (!blocks || blocks.length === 0) return null;

    let text = "My Weekly Shopping List:\n\n";
    blocks.forEach(block => {
        const title = block.querySelector(".recipe-block-title")?.innerText.trim() || block.dataset.recipeName || "Recipe";
        text += `[${title}]\n`;
        block.querySelectorAll(".ingredient-item-text").forEach(item => {
            text += `  • ${item.innerText}\n`;
        });
        text += `\n`;
    });
    return text;
}

function shareWhatsApp() {
    const text = getFullShoppingListText();
    if (!text) {
        showToast("Shopping list is empty! Plan some meals first.", "info");
        return;
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
}

function copyShoppingList() {
    const text = getFullShoppingListText();
    if (!text) {
        showToast("Shopping list is empty! Plan some meals first.", "info");
        return;
    }
    navigator.clipboard.writeText(text).then(() => {
        showToast("Full Shopping List copied to clipboard!", "success");
    }).catch(() => {
        showToast("Clipboard copy failed. Please grant permission.", "error");
    });
}

function downloadTxtList() {
    const text = getFullShoppingListText();
    if (!text) {
        showToast("Shopping list is empty! Plan some meals first.", "info");
        return;
    }
    const blob = new Blob([text], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "Full_Shopping_List.txt";
    a.click();
    showToast("Downloaded Full_Shopping_List.txt", "info");
}

// =============================================================================
// INGREDIENT RECIPE MATCHER (Subset matching against saved recipes)
// =============================================================================

function generateFromDatabase() {
    const inputVal = document.getElementById("findIngredientsInput").value.trim().toLowerCase();
    const area = document.getElementById("foundRecipesArea");
    if (!area) return;

    area.innerHTML = "";

    if (!inputVal) {
        showToast("Please enter one or more ingredients to match!", "error");
        return;
    }

    const searchTerms = inputVal.split(',').map(i => i.trim().toLowerCase()).filter(Boolean);

    const matched = recipes.filter(r => {
        const ingStr = r.ingredients ? r.ingredients.toLowerCase() : '';
        const nameStr = r.name ? r.name.toLowerCase() : '';
        return searchTerms.every(term => ingStr.includes(term) || nameStr.includes(term));
    });

    if (matched.length === 0) {
        area.innerHTML = `<p style="color:var(--text-muted); padding: 12px 0; font-size:0.9rem;">No matching recipes found containing: "<strong>${escapeHtml(inputVal)}</strong>". Try different ingredients.</p>`;
        return;
    }

    area.innerHTML = `<h4 style="color:var(--text-primary); margin-bottom:10px; font-size:1.05rem; font-weight:800;">Matching Recipes (${matched.length}):</h4>`;

    matched.forEach(r => {
        area.innerHTML += `
            <div style="padding:16px 20px; background:var(--bg-subtle); border-radius:var(--radius-lg); border:1px solid var(--border-subtle); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
                <div>
                    <h4 style="color:var(--text-primary); font-size: 1.05rem; margin-bottom: 4px; font-weight: 800; display:flex; align-items:center; gap:8px;">
                        <span class="material-symbols-outlined" style="color:var(--btn-primary-bg); font-size:1.15rem;" aria-hidden="true">menu_book</span>
                        ${escapeHtml(r.name)} <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: normal;">(${escapeHtml(r.mealType || 'Meal')} • ${r.prepTime || 0} mins)</span>
                    </h4>
                    <p style="font-size:0.86rem; color:var(--text-body);"><strong>Ingredients:</strong> ${escapeHtml(r.ingredients)}</p>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button type="button" class="btn-submit btn-primary btn-sm" onclick="openCookMode(${r.id})">
                        <span class="material-symbols-outlined" aria-hidden="true">skillet</span> <span>Start Cooking</span>
                    </button>
                    <button type="button" class="btn-submit btn-secondary btn-sm" onclick="navigateToRecipe(${r.id})">
                        <span class="material-symbols-outlined" aria-hidden="true">visibility</span> <span>View Recipe</span>
                    </button>
                </div>
            </div>
        `;
    });
}

// =============================================================================
// UTILITIES
// =============================================================================

function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}