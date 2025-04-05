// ========================================================================
// ComicTrackr - Frontend Application Logic (v.Contrast)
// ========================================================================

// --- Constants ---
const COMICS_STORAGE_KEY = 'comicTrackr_comics_v2'; // Updated key if schema changes
const WANTS_STORAGE_KEY = 'comicTrackr_wants_v2';
const LAYOUT_STORAGE_KEY = 'comicTrackr_layout';
const PLACEHOLDER_IMAGE = 'https://placehold.co/200x300/e2e8f0/94a3b8?text=No+Cover';
const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB limit for cover images

// --- DOM Element References ---
const appElements = {
    views: {
        collection: document.getElementById('view-collection'),
        add: document.getElementById('view-add'),
        detail: document.getElementById('view-detail'),
        series: document.getElementById('view-series')
    },
    collection: {
        list: document.getElementById('collection-list'),
        listView: document.getElementById('collection-list-list-view'),
        noComicsMessage: document.getElementById('no-comics-message'),
        loadingSpinner: document.getElementById('loading-spinner'),
        searchInput: document.getElementById('search-input'),
        toggleViewBtn: document.getElementById('toggle-view-btn')
    },
    addForm: {
        form: document.getElementById('comic-form'),
        title: document.getElementById('add-edit-title'),
        idInput: document.getElementById('comic-id'),
        titleInput: document.getElementById('comic-title'),
        issueInput: document.getElementById('comic-issue'),
        dateInput: document.getElementById('comic-date'),
        costInput: document.getElementById('comic-cost'),
        artistInput: document.getElementById('comic-artist'),
        publisherInput: document.getElementById('comic-publisher'),
        coverUpload: document.getElementById('comic-cover-upload'),
        coverPreview: document.getElementById('cover-preview'),
        coverDataInput: document.getElementById('comic-cover-data'),
        submitBtn: document.querySelector('#comic-form button[type="submit"]'), // More specific selector
        saveBtnText: document.getElementById('save-btn-text'),
        saveBtnLoader: document.getElementById('save-btn-loader')
    },
    detail: {
        content: document.getElementById('detail-content'),
        editBtn: document.getElementById('edit-comic-btn'),
        deleteBtn: document.getElementById('delete-comic-btn'),
        backBtn: document.getElementById('back-to-collection-detail-btn')
    },
    series: {
        title: document.getElementById('series-title'),
        list: document.getElementById('series-list'),
        backBtn: document.getElementById('back-to-detail-btn'),
        backBtnInfo: document.getElementById('back-to-detail-comic-info')
    },
    navigation: {
        navButtons: document.querySelectorAll('.nav-btn'),
        scanBtn: document.getElementById('scan-comic-btn'),
        backToAddBtn: document.getElementById('back-to-collection-btn')
    },
    ui: {
        messageBox: document.getElementById('message-box'),
        messageBoxIcon: document.getElementById('message-box-icon'),
        messageBoxText: document.getElementById('message-box-text')
    }
};

// --- Application State ---
let state = {
    comics: [], // Array of comic objects { id, title, issue, ..., status: { owned, read, wants } }
    wantsList: [], // Array of want objects { title, issue }
    currentView: 'collection', // Tracks the current visible view ID ('collection', 'add', 'detail', 'series')
    currentDetailComicId: null, // Tracks the comic being viewed in detail/series
    currentLayout: 'grid', // 'grid' or 'list'
    messageTimeoutId: null // ID for the message box timeout
};

// --- Mock Series Database (for enhanced simulation) ---
const mockSeriesDb = {
    "Amazing Spider-Man": [1, 2, 3, 4, 5, 298, 299, 300, 600, 700, 800, 801],
    "Batman": [1, 2, 3, 404, 405, 406, 407, 608, 609, 610, 1000],
    "Saga": [1, 2, 3, 4, 5, 6, 50, 51, 52, 53, 54],
    "Invincible": [1, 2, 3, 100, 144]
    // Add more series/issues as needed for demo
};


// ========================================================================
// Utility Functions
// ========================================================================

/**
 * Shows a specific view panel and hides others.
 * @param {string} viewId - The ID of the view to show ('collection', 'add', 'detail', 'series').
 */
function showView(viewId) {
    console.log(`Navigating to view: view-${viewId}`);
    state.currentView = viewId;
    // Hide all views
    Object.values(appElements.views).forEach(view => view.classList.add('hidden'));
    // Show the target view
    const targetViewElement = appElements.views[viewId];
    if (targetViewElement) {
        targetViewElement.classList.remove('hidden');
        // ** Ensure save button is enabled when navigating TO the add view **
        if (viewId === 'add') {
            setSaveButtonState(true); // Enable the button
        }
    } else {
        console.error("View element not found for ID:", viewId);
        appElements.views.collection.classList.remove('hidden'); // Fallback
        state.currentView = 'collection';
    }
    updateNavButtonsUI();
    window.scrollTo(0, 0); // Scroll to top on view change
}

/**
 * Updates the visual state (active/inactive) of the bottom navigation buttons.
 */
function updateNavButtonsUI() {
    appElements.navigation.navButtons.forEach(btn => {
        const view = btn.getAttribute('data-view');
        // Use more robust check for active state
        const isActive = (view === state.currentView);
         btn.classList.toggle('text-indigo-600', isActive);
         btn.classList.toggle('text-gray-500', !isActive); // Adjusted inactive color
         btn.classList.toggle('hover:text-indigo-600', !isActive); // Keep hover effect on inactive
    });
     // Special handling for scan button (never appears 'active')
     appElements.navigation.scanBtn.classList.remove('text-indigo-600');
     appElements.navigation.scanBtn.classList.add('text-gray-500', 'hover:text-indigo-600');
}

/**
 * Loads comics, wants list, and layout preference from localStorage.
 * Includes error handling for corrupted data.
 */
function loadData() {
    try {
        const storedComics = localStorage.getItem(COMICS_STORAGE_KEY);
        const storedWants = localStorage.getItem(WANTS_STORAGE_KEY);
        const storedLayout = localStorage.getItem(LAYOUT_STORAGE_KEY);

        state.comics = storedComics ? JSON.parse(storedComics) : [];
        state.wantsList = storedWants ? JSON.parse(storedWants) : [];
        state.currentLayout = storedLayout || 'grid';

        // Basic validation of loaded data (optional but good practice)
        if (!Array.isArray(state.comics)) state.comics = [];
        if (!Array.isArray(state.wantsList)) state.wantsList = [];
        if (typeof state.currentLayout !== 'string' || !['grid', 'list'].includes(state.currentLayout)) state.currentLayout = 'grid';

        console.log(`Loaded ${state.comics.length} comics, ${state.wantsList.length} wants, layout: ${state.currentLayout}`);
    } catch (error) {
        console.error("Error loading data from localStorage:", error);
        showMessage("Error loading saved data. Starting fresh.", 'error', 5000);
        // Reset state in case of corrupted data
        state.comics = [];
        state.wantsList = [];
        state.currentLayout = 'grid';
        // Optionally clear corrupted storage
        // localStorage.removeItem(COMICS_STORAGE_KEY);
        // localStorage.removeItem(WANTS_STORAGE_KEY);
    }
    updateToggleViewButtonUI();
}

/**
 * Saves the current state (comics, wants, layout) to localStorage.
 * Includes error handling for storage limits.
 */
function saveData() {
     try {
        localStorage.setItem(COMICS_STORAGE_KEY, JSON.stringify(state.comics));
        localStorage.setItem(WANTS_STORAGE_KEY, JSON.stringify(state.wantsList));
        localStorage.setItem(LAYOUT_STORAGE_KEY, state.currentLayout);
        console.log(`Saved ${state.comics.length} comics, ${state.wantsList.length} wants, layout: ${state.currentLayout}`);
     } catch (error) {
         console.error("Error saving data to localStorage:", error);
         // Check for QuotaExceededError specifically
         if (error.name === 'QuotaExceededError') {
             showMessage("Error: Storage limit reached. Cannot save changes. Try removing large cover images or deleting comics.", 'error', 8000);
         } else {
             showMessage("Error saving data.", 'error', 5000);
         }
     }
}

/**
 * Displays temporary messages to the user with different styles.
 * @param {string} message - The text to display.
 * @param {'success'|'error'|'info'} type - The type of message for styling.
 * @param {number} [duration=3500] - How long the message stays visible (in ms).
 */
function showMessage(message, type = 'info', duration = 3500) {
    const { messageBox, messageBoxIcon, messageBoxText } = appElements.ui;

    // Clear existing timer
    if (state.messageTimeoutId) {
        clearTimeout(state.messageTimeoutId);
    }

    // Set text and icon
    messageBoxText.textContent = message;
    let iconClass = '';
    switch (type) {
        case 'success':
            iconClass = 'icon-check-circle';
            break;
        case 'error':
            iconClass = 'icon-alert-triangle';
            break;
        case 'info':
        default:
            // Use a generic info icon if needed, or leave blank
            iconClass = ''; // Or 'icon-info' if you add it
            break;
    }
    messageBoxIcon.className = `lucide ${iconClass}`;
    messageBoxIcon.style.display = iconClass ? 'inline-block' : 'none'; // Hide icon if none specified

    // Set style class
    messageBox.className = ``; // Clear previous classes first!
    messageBox.classList.add('show'); // Add show class first
    messageBox.classList.add(type); // Add type class (success, error, info)


    // Set timer to hide
    state.messageTimeoutId = setTimeout(() => {
        messageBox.classList.remove('show');
        state.messageTimeoutId = null;
         // Also remove type class after hiding
         setTimeout(() => { messageBox.classList.remove(type); }, 500); // Delay removal for fade out
    }, duration);
}

/**
 * Generates a reasonably unique ID for new comics.
 * @returns {string} A unique ID string.
 */
function generateComicId() {
     return `comic_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Sets the enabled/disabled state of the Save Comic button and toggles the loader.
 * @param {boolean} enable - True to enable, false to disable.
 */
function setSaveButtonState(enable) {
     const { submitBtn, saveBtnText, saveBtnLoader } = appElements.addForm;
     if (enable) {
         submitBtn.disabled = false;
         submitBtn.classList.remove('opacity-60', 'cursor-not-allowed'); // Adjusted disabled style class
         saveBtnText.classList.remove('hidden');
         saveBtnLoader.classList.add('hidden');
     } else {
         submitBtn.disabled = true;
         submitBtn.classList.add('opacity-60', 'cursor-not-allowed');
         saveBtnText.classList.add('hidden');
         saveBtnLoader.classList.remove('hidden');
     }
}

// ========================================================================
// Rendering Functions
// ========================================================================

/**
 * Renders the collection view (grid or list) based on the current filter and layout.
 * @param {string} [filter=''] - The search term to filter comics by.
 */
function renderCollection(filter = '') {
    const { list, listView, loadingSpinner, noComicsMessage } = appElements.collection;
    list.innerHTML = ''; // Clear grid view
    listView.innerHTML = ''; // Clear list view
    loadingSpinner.classList.remove('hidden');
    noComicsMessage.classList.add('hidden');
    console.log(`Rendering collection with filter: "${filter}"`);

    // Use requestAnimationFrame for smoother rendering, especially with the timeout
    requestAnimationFrame(() => {
        // Simulate loading delay for visual feedback
        setTimeout(() => {
            try {
                const lowerCaseFilter = filter.toLowerCase();
                const filteredComics = state.comics.filter(comic =>
                    comic.title.toLowerCase().includes(lowerCaseFilter) ||
                    comic.issue.toLowerCase().includes(lowerCaseFilter) ||
                    (comic.publisher && comic.publisher.toLowerCase().includes(lowerCaseFilter))
                ).sort((a, b) => {
                     // Sort primarily by title, then by issue number (attempt numeric sort)
                     const titleCompare = a.title.toLowerCase().localeCompare(b.title.toLowerCase());
                     if (titleCompare !== 0) return titleCompare;
                     const issueA = parseFloat(a.issue);
                     const issueB = parseFloat(b.issue);
                     if (!isNaN(issueA) && !isNaN(issueB)) return issueA - issueB;
                     if (!isNaN(issueA)) return -1; // Numeric issues first
                     if (!isNaN(issueB)) return 1;
                     return a.issue.localeCompare(b.issue); // Fallback string compare
                 });

                console.log(`Found ${filteredComics.length} comics matching filter.`);

                if (filteredComics.length === 0) {
                    noComicsMessage.classList.remove('hidden');
                    noComicsMessage.textContent = filter
                        ? `No comics found matching "${filter}".`
                        : 'Your collection is empty. Add some comics!';
                } else {
                    noComicsMessage.classList.add('hidden');
                    filteredComics.forEach(comic => {
                        const coverSrc = comic.coverImage || PLACEHOLDER_IMAGE;
                        const readIconHtml = comic.status.read ? '<span class="lucide icon-eye text-green-500 text-xs" title="Read"></span>' : '<span class="lucide icon-eye-off text-gray-400 text-xs" title="Unread"></span>'; // Adjusted unread icon color
                        const readIconHtmlSm = comic.status.read ? '<span class="lucide icon-eye text-green-500 icon-sm" title="Read"></span>' : '<span class="lucide icon-eye-off text-gray-400 icon-sm" title="Unread"></span>'; // Adjusted unread icon color

                        // --- Grid Item ---
                        const gridItem = document.createElement('div');
                        // Adjusted text colors
                        gridItem.className = 'comic-item bg-white rounded-lg shadow overflow-hidden cursor-pointer transform transition hover:scale-105 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-1';
                        gridItem.dataset.id = comic.id;
                        gridItem.setAttribute('tabindex', '0'); // Make it focusable
                        gridItem.setAttribute('role', 'button');
                        gridItem.setAttribute('aria-label', `${comic.title} issue ${comic.issue}`);
                        gridItem.innerHTML = `
                            <img loading="lazy" src="${coverSrc}" alt="${comic.title} Cover" class="w-full h-48 object-cover" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMAGE}';">
                            <div class="p-2">
                                <h3 class="font-semibold text-sm text-gray-800 truncate" title="${comic.title} #${comic.issue}">${comic.title}</h3>
                                <p class="text-xs text-gray-600">#${comic.issue}</p>
                                <div class="mt-1 flex justify-end space-x-1">${readIconHtml}</div>
                            </div>
                        `;
                        gridItem.addEventListener('click', () => handleComicItemClick(comic.id));
                        gridItem.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') handleComicItemClick(comic.id); });
                        list.appendChild(gridItem);

                        // --- List Item ---
                        const listItem = document.createElement('div');
                        // Adjusted text colors
                        listItem.className = 'comic-list-item bg-white rounded-lg shadow p-3 flex items-center space-x-3 cursor-pointer hover:bg-gray-50 focus-within:ring-1 focus-within:ring-indigo-500';
                        listItem.dataset.id = comic.id;
                        listItem.setAttribute('tabindex', '0'); // Make it focusable
                        listItem.setAttribute('role', 'button');
                        listItem.setAttribute('aria-label', `${comic.title} issue ${comic.issue}`);
                        listItem.innerHTML = `
                             <img loading="lazy" src="${coverSrc}" alt="${comic.title} Cover" class="w-12 h-16 object-cover rounded flex-shrink-0" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMAGE}';">
                             <div class="flex-grow overflow-hidden">
                                 <h3 class="font-semibold text-base text-gray-800 truncate" title="${comic.title} #${comic.issue}">${comic.title} #${comic.issue}</h3>
                                 <p class="text-sm text-gray-500 truncate">${comic.publisher || 'Unknown Publisher'}</p>
                             </div>
                             <div class="flex-shrink-0 flex items-center space-x-2">${readIconHtmlSm}</div>
                        `;
                        listItem.addEventListener('click', () => handleComicItemClick(comic.id));
                        listItem.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') handleComicItemClick(comic.id); });
                        listView.appendChild(listItem);
                    });
                }
                toggleCollectionViewLayoutUI(state.currentLayout);
            } catch (error) {
                console.error("Error rendering collection:", error);
                noComicsMessage.textContent = 'Error displaying comics.';
                noComicsMessage.classList.remove('hidden');
            } finally {
                 loadingSpinner.classList.add('hidden');
            }
        }, 50); // Reduced delay slightly
    });
}

/**
 * Updates the UI to show either the grid or list view container.
 * @param {'grid'|'list'} layout - The layout to display.
 */
function toggleCollectionViewLayoutUI(layout) {
     const { list, listView } = appElements.collection;
     if (layout === 'list') {
         list.classList.add('hidden');
         listView.classList.remove('hidden');
     } else { // Default to grid
         list.classList.remove('hidden');
         listView.classList.add('hidden');
     }
     // Update button icon in a separate function
     updateToggleViewButtonUI();
}

/**
 * Updates the icon on the grid/list toggle button based on the current layout.
 */
function updateToggleViewButtonUI() {
     const iconSpan = appElements.collection.toggleViewBtn.querySelector('.lucide');
     if (state.currentLayout === 'list') {
         iconSpan.className = 'lucide icon-layout-grid icon-sm'; // Set class directly
         appElements.collection.toggleViewBtn.setAttribute('aria-label', 'Switch to grid view');
     } else {
         iconSpan.className = 'lucide icon-list icon-sm'; // Set class directly
         appElements.collection.toggleViewBtn.setAttribute('aria-label', 'Switch to list view');
     }
}

/**
 * Renders the comic detail view for a specific comic ID.
 * @param {string} comicId - The ID of the comic to display.
 */
function showComicDetail(comicId) {
    const { content: detailContentElement } = appElements.detail;
    detailContentElement.innerHTML = '<div class="loader"></div>'; // Show loader immediately
    showView('detail'); // Switch view first

    // Find comic asynchronously (though data is local)
    setTimeout(() => {
        const comic = state.comics.find(c => c.id === comicId);
        if (!comic) {
            showMessage("Error: Comic not found.", 'error');
            showView('collection'); // Go back if comic doesn't exist
            return;
        }
        console.log("Showing details for comic:", comic);
        state.currentDetailComicId = comicId; // Store for actions

        const coverSrc = comic.coverImage || PLACEHOLDER_IMAGE;
        const costDisplay = comic.cost ? `$${parseFloat(comic.cost).toFixed(2)}` : '';
        const readButtonText = comic.status.read ? 'Mark as Unread' : 'Mark as Read';
        const readButtonIcon = comic.status.read ? 'icon-eye-off' : 'icon-eye';
        const readButtonColor = comic.status.read ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-600 hover:bg-green-700';

        // Adjusted text colors for detail view
        detailContentElement.innerHTML = `
            <img src="${coverSrc}" alt="${comic.title} Cover" class="w-full max-w-xs mx-auto h-auto object-contain rounded-lg shadow mb-4" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMAGE}';">
            <h2 class="text-xl font-bold text-gray-900">${comic.title} #${comic.issue}</h2>
            ${comic.publisher ? `<p class="text-sm text-gray-600"><strong>Publisher:</strong> ${comic.publisher}</p>` : ''}
            ${comic.artist ? `<p class="text-sm text-gray-600"><strong>Cover Artist:</strong> ${comic.artist}</p>` : ''}
            ${comic.releaseDate ? `<p class="text-sm text-gray-600"><strong>Released:</strong> ${comic.releaseDate}</p>` : ''}
            ${costDisplay ? `<p class="text-sm text-gray-600"><strong>Cost:</strong> ${costDisplay}</p>` : ''}
            <div class="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center space-x-2">
                 <button id="toggle-read-btn" class="flex-1 inline-flex justify-center items-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${readButtonColor} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    <span class="lucide ${readButtonIcon} mr-2"></span> ${readButtonText}
                </button>
                 <button id="view-series-btn" class="flex-1 inline-flex justify-center items-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    View Series
                </button>
            </div>
        `;
        // Add event listeners for detail view buttons (important to do AFTER setting innerHTML)
        detailContentElement.querySelector('#toggle-read-btn').addEventListener('click', handleToggleReadClick);
        detailContentElement.querySelector('#view-series-btn').addEventListener('click', handleViewSeriesClick);
    }, 50); // Short delay to allow loader to show
}

 /**
  * Renders the series view, simulating data fetching.
  * Uses mockSeriesDb for known titles, otherwise shows related owned/wanted comics.
  * @param {string} title - The title of the series.
  * @param {string} originatingComicId - The ID of the comic the user clicked on to get here.
  */
function showSeriesView(title, originatingComicId) {
    state.currentDetailComicId = originatingComicId; // Store for back button context
    const { title: seriesTitleElement, list: seriesListElement, backBtnInfo } = appElements.series;

    seriesTitleElement.textContent = title;
    seriesListElement.innerHTML = '<div class="loader"></div>'; // Show loader
    showView('series'); // Switch view

    // Set back button text
    const originatingComic = state.comics.find(c => c.id === originatingComicId);
    backBtnInfo.textContent = `Back to ${title} #${originatingComic?.issue || 'Details'}`;
    console.log(`Showing series view for title: "${title}"`);


    // Simulate fetching series data
    setTimeout(() => {
        seriesListElement.innerHTML = ''; // Clear loader
        try {
            const lowerTitle = title.toLowerCase();
            let issuesToShow = [];
            let source = 'collection'; // Where did the list of issues come from?

            // Check if the title exists in our mock database
            const mockIssuesKey = Object.keys(mockSeriesDb).find(key => key.toLowerCase() === lowerTitle);
            if (mockIssuesKey) {
                issuesToShow = mockSeriesDb[mockIssuesKey];
                source = 'mockDB';
                console.log(`Using mockDB for "${title}". Issues:`, issuesToShow);
            } else {
                // Fallback: Show only owned and wanted issues if not in mock DB
                const owned = state.comics
                    .filter(c => c.title.toLowerCase() === lowerTitle)
                    .map(c => c.issue);
                const wanted = state.wantsList
                    .filter(w => w.title.toLowerCase() === lowerTitle)
                    .map(w => w.issue);
                // Combine and unique sort
                issuesToShow = [...new Set([...owned, ...wanted])].sort((a, b) => {
                     const issueA = parseFloat(a) || a; const issueB = parseFloat(b) || b;
                     if (!isNaN(issueA) && !isNaN(issueB)) return issueA - issueB;
                     if (!isNaN(issueA)) return -1; if (!isNaN(issueB)) return 1;
                     return a.localeCompare(b);
                 });
                console.log(`Using owned/wanted issues for "${title}". Issues:`, issuesToShow);
            }


            if (issuesToShow.length === 0 && source !== 'mockDB') {
                 // Only show this if we didn't even have mock data and no owned/wanted either
                 seriesListElement.innerHTML = '<p class="text-gray-500 text-center p-4">No other issues found for this series in your collection or wishlist.</p>';
            } else {
                 // --- Render Issues ---
                 issuesToShow.forEach(issueNumStr => {
                     const issueNum = String(issueNumStr); // Ensure it's a string for comparisons
                     const ownedComic = state.comics.find(c => c.title.toLowerCase() === lowerTitle && String(c.issue) === issueNum);
                     const isWanted = !ownedComic && state.wantsList.some(w => w.title.toLowerCase() === lowerTitle && String(w.issue) === issueNum);
                     const isOriginating = ownedComic?.id === originatingComicId;

                     const issueDiv = document.createElement('div');
                     // Adjusted text/icon colors
                     issueDiv.className = `flex justify-between items-center p-3 bg-white rounded shadow-sm text-gray-800 ${ownedComic ? 'hover:bg-gray-50 cursor-pointer' : ''} ${isOriginating ? 'ring-2 ring-indigo-400' : ''}`;
                     if (ownedComic) {
                         issueDiv.dataset.comicId = ownedComic.id; // Allow clicking owned issues
                         issueDiv.setAttribute('role', 'button');
                         issueDiv.setAttribute('tabindex', '0');
                         issueDiv.setAttribute('aria-label', `View details for issue ${issueNum}`);
                     }

                     let statusHtml = '';
                     if (ownedComic) {
                         statusHtml = `
                             ${ownedComic.status.read
                                 ? '<span class="lucide icon-eye text-green-500 text-sm" title="Read"></span>'
                                 : '<span class="lucide icon-eye-off text-gray-400 text-sm" title="Unread"></span>' // Adjusted unread icon
                             }
                             <span class="text-xs font-medium text-indigo-600">Owned</span>
                         `;
                     } else if (isWanted) {
                         statusHtml = `
                             <button data-title="${title}" data-issue="${issueNum}" aria-label="Remove issue ${issueNum} from Wishlist" class="toggle-want-btn text-red-500 hover:text-red-700 focus:outline-none focus:ring-1 focus:ring-red-500 rounded-full p-1">
                                 <span class="lucide icon-heart icon-sm" title="On Wishlist"></span>
                             </button>
                         `;
                     } else {
                         // Neither owned nor wanted
                         statusHtml = `
                             <button data-title="${title}" data-issue="${issueNum}" aria-label="Add issue ${issueNum} to Wishlist" class="toggle-want-btn text-gray-400 hover:text-green-600 focus:outline-none focus:ring-1 focus:ring-green-500 rounded-full p-1">
                                 <span class="lucide icon-heart icon-sm" title="Add to Wishlist"></span>
                             </button>
                         `;
                     }

                     issueDiv.innerHTML = `
                         <span>Issue #${issueNum}</span>
                         <div class="flex items-center space-x-2">
                             ${statusHtml}
                         </div>
                     `;
                     seriesListElement.appendChild(issueDiv);
                 });

                 // Add event listener using event delegation on the list container
                 seriesListElement.addEventListener('click', handleSeriesItemInteraction);
                 seriesListElement.addEventListener('keydown', handleSeriesItemInteraction); // For keyboard nav
            }

        } catch (error) {
            console.error("Error rendering series view:", error);
            seriesListElement.innerHTML = '<p class="text-red-500 text-center p-4">Error loading series information.</p>';
        }

    }, 200); // Simulate API call delay slightly longer
}


// ========================================================================
// Event Handlers & Action Functions
// ========================================================================

 /**
  * Handles clicks or keydown (Enter/Space) on items in the collection view.
  * @param {string} comicId - The ID of the clicked comic.
  */
 function handleComicItemClick(comicId) {
     console.log("Comic item clicked/activated:", comicId);
     showComicDetail(comicId);
 }

 /**
  * Handles clicks or keydown (Enter/Space) within the series list (delegated).
  * Differentiates between clicking an owned comic and toggling want status.
  * @param {Event} e - The event object.
  */
 function handleSeriesItemInteraction(e) {
     if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') {
         return; // Only handle Enter/Space for keydown
     }

     const target = e.target;
     const wantButton = target.closest('.toggle-want-btn');
     const ownedItem = target.closest('[data-comic-id]'); // Check if clicking an owned item div

     if (wantButton) {
         e.preventDefault(); // Prevent default button behavior if any
         const wantTitle = wantButton.dataset.title;
         const wantIssue = wantButton.dataset.issue;
         console.log(`Want button clicked for ${wantTitle} #${wantIssue}`);
         toggleWantStatus(wantTitle, wantIssue); // Let toggleWantStatus handle add/remove logic
         // Re-render the series view to reflect the change immediately
         showSeriesView(wantTitle, state.currentDetailComicId);
     } else if (ownedItem && (e.type === 'click' || e.type === 'keydown')) { // Handle click or keydown on owned item
          e.preventDefault();
          const comicId = ownedItem.dataset.comicId;
          console.log(`Owned series item activated: ${comicId}`);
          showComicDetail(comicId);
     }
 }


/**
 * Handles form submission for adding/editing comics. Includes validation.
 * @param {Event} e - The form submission event.
 */
function handleComicFormSubmit(e) {
    e.preventDefault(); // Prevent default page reload
    console.log('Comic form submission initiated.');
    const { form, idInput, titleInput, issueInput, dateInput, costInput, artistInput, publisherInput, coverDataInput } = appElements.addForm;

    // --- Basic Client-Side Validation ---
    let isValid = true;
    // Clear previous errors
    form.querySelectorAll('[data-validation-for]').forEach(el => el.classList.add('hidden'));

    const title = titleInput.value.trim();
    const issue = issueInput.value.trim();
    const cost = costInput.value.trim();

    if (!title) {
        isValid = false;
        form.querySelector('[data-validation-for="comic-title"]').classList.remove('hidden');
    }
    if (!issue) {
        isValid = false;
        form.querySelector('[data-validation-for="comic-issue"]').classList.remove('hidden');
    }
    if (cost && (isNaN(parseFloat(cost)) || parseFloat(cost) < 0)) {
         isValid = false;
         form.querySelector('[data-validation-for="comic-cost"]').classList.remove('hidden');
    }
     // Image size validation (already done on change, but double check)
     const coverData = coverDataInput.value;
     const imageSizeErrorElement = form.querySelector('[data-validation-for="comic-cover-upload"]');
     if (coverData && coverData.length * 0.75 > MAX_IMAGE_SIZE_BYTES) { // Estimate byte size from base64 length
         isValid = false;
         imageSizeErrorElement.textContent = "Image file is too large (max 2MB).";
         imageSizeErrorElement.classList.remove('hidden');
         showMessage("Cover image is too large (max 2MB). Please choose a smaller file.", 'error', 5000);
     }


    if (!isValid) {
        console.warn("Form validation failed.");
        showMessage("Please correct the errors in the form.", 'error');
        return; // Stop submission
    }

    // --- Disable button, show loader ---
    setSaveButtonState(false); // Disable button

    // --- Process Data ---
    const id = idInput.value; // Get ID if editing
    const releaseDate = dateInput.value;
    const artist = artistInput.value.trim();
    const publisher = publisherInput.value.trim();
    // Get cover image data (already validated for size)
    let finalCoverImage = coverData;
     // If editing and no *new* cover data was provided, keep the existing one
     if (id && !finalCoverImage) {
         const existingComic = state.comics.find(c => c.id === id);
         finalCoverImage = existingComic ? existingComic.coverImage : null;
     }


    console.log('Form data validated:', { id, title, issue, releaseDate, cost, artist, publisher, coverImage: finalCoverImage ? 'Image data present' : 'No image data' });

    // Simulate save delay
    setTimeout(() => {
        try {
            if (id) {
                // --- Editing existing comic ---
                const index = state.comics.findIndex(c => c.id === id);
                if (index > -1) {
                    state.comics[index] = {
                        ...state.comics[index], // Keep existing status
                        title, issue, releaseDate, cost, artist, publisher,
                        coverImage: finalCoverImage // Update cover image
                    };
                    console.log('Updated comic object:', state.comics[index]);
                    showMessage("Comic updated successfully!", 'success');
                } else {
                     console.error("Failed to find comic with ID for editing:", id);
                     throw new Error("Could not find the comic to update."); // Throw error to be caught
                }
            } else {
                // --- Adding new comic ---
                const newComic = {
                    id: generateComicId(),
                    title, issue, releaseDate, cost, artist, publisher,
                    coverImage: finalCoverImage,
                    status: { owned: true, read: false, wants: false } // Default status
                };
                console.log('New comic object:', newComic);
                state.comics.push(newComic);

                // Check if this comic was on the wants list and remove it
                const wasWanted = removeWantIfExists(title, issue);
                showMessage(wasWanted ? "Comic added and removed from wishlist!" : "Comic added successfully!", 'success');
            }

            saveData();
            resetForm(); // Reset form fields (also enables button)
            renderCollection(); // Render the updated collection
            console.log('Save successful, navigating back to collection.');
            showView('collection'); // Navigate back

        } catch (error) {
             console.error("Error during form submission processing:", error);
             showMessage(`Error saving comic: ${error.message || 'Unknown error'}`, 'error', 5000);
             setSaveButtonState(true); // Re-enable button on error
        }
    }, 300); // Simulate network delay
}

/**
 * Handles the selection of a cover image file. Validates size and type.
 * @param {Event} event - The file input change event.
 */
function handleCoverImageChange(event) {
    const file = event.target.files[0];
    const { coverPreview, coverDataInput } = appElements.addForm;
    const errorElement = appElements.addForm.form.querySelector('[data-validation-for="comic-cover-upload"]');
    errorElement.classList.add('hidden'); // Hide previous error

    console.log("File selected:", file ? file.name : "No file");
    if (file && file.type.startsWith('image/')) {
        // Check file size
        if (file.size > MAX_IMAGE_SIZE_BYTES) {
             showMessage("Image file is too large (max 2MB).", 'error', 4000);
             errorElement.textContent = "Image file is too large (max 2MB).";
             errorElement.classList.remove('hidden');
             resetCoverPreview();
             return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            console.log("FileReader loaded image data.");
            coverPreview.src = e.target.result;
            coverPreview.classList.remove('hidden');
            coverDataInput.value = e.target.result; // Store base64 data URL
        }
        reader.onerror = function(e) {
             console.error("FileReader error:", e);
             showMessage("Error reading image file.", 'error', 4000);
             resetCoverPreview();
        }
        reader.readAsDataURL(file);
    } else if (file) {
         // Invalid file type selected
         showMessage("Please select a valid image file (JPEG, PNG, GIF, WebP).", 'error', 4000);
         resetCoverPreview();
    } else {
        // No file selected or selection cancelled
         resetCoverPreview();
    }
}

/**
 * Resets the cover image preview and associated hidden input field.
 */
function resetCoverPreview() {
     const { coverPreview, coverDataInput, coverUpload } = appElements.addForm;
     coverPreview.classList.add('hidden');
     coverPreview.src = '#';
     coverDataInput.value = '';
     // Reset the input value so selecting the same file again triggers 'change'
     coverUpload.value = '';
     console.log("Cover preview reset.");
      // Hide validation message specific to cover upload
     appElements.addForm.form.querySelector('[data-validation-for="comic-cover-upload"]').classList.add('hidden');
}

/**
 * Resets the entire add/edit form to its default state.
 */
function resetForm() {
    const { form, idInput, title: addEditTitleElement } = appElements.addForm;
    form.reset(); // Resets all standard form fields
    idInput.value = ''; // Ensure hidden ID is cleared
    resetCoverPreview(); // Reset image preview
    addEditTitleElement.textContent = 'Add New Comic';
    // Clear validation messages
    form.querySelectorAll('[data-validation-for]').forEach(el => el.classList.add('hidden'));
    setSaveButtonState(true); // Ensure button is enabled after reset
    console.log("Add/Edit form reset.");
}

/**
 * Handles clicks on the bottom navigation buttons.
 * @param {Event} event - The click event.
 */
function handleNavButtonClick(event) {
    const button = event.currentTarget;
    const targetView = button.getAttribute('data-view');
    if (targetView) {
        // Only reset form if navigating TO the add view or away from it
        if (targetView === 'add' || state.currentView === 'add') {
            resetForm(); // Resetting ensures save button is enabled
        }
        showView(targetView);
    }
}

/**
 * Handles the click on the (simulated) Scan Comic button.
 */
function handleScanButtonClick() {
    console.log("Scan Comic button clicked (simulation).");
    resetForm(); // Start with a clean form (enables save button)
    // Simulate finding a comic
    appElements.addForm.titleInput.value = "Saga"; // Use a different example
    appElements.addForm.issueInput.value = "1";
    appElements.addForm.dateInput.value = "2012-03-14";
    appElements.addForm.artistInput.value = "Fiona Staples";
    appElements.addForm.publisherInput.value = "Image Comics";
    // No cover image simulation here, user would still need to take photo
    appElements.addForm.title.textContent = 'Add Scanned Comic (Confirm Details)';
    showView('add'); // Go to the add form for confirmation/saving
    showMessage("Simulated Scan: Please confirm details and add cover.", 'info', 4000);
}

/**
 * Handles clicks on the various "Back" buttons.
 * @param {Event} event - The click event.
 */
function handleBackButtonClick(event) {
     const buttonId = event.currentTarget.id;
     console.log(`Back button clicked: ${buttonId}`);
     const currentFilter = appElements.collection.searchInput.value.trim();

     switch (buttonId) {
         case 'back-to-collection-btn': // From Add/Edit view
             resetForm(); // Reset form when leaving Add/Edit view
             showView('collection');
             renderCollection(currentFilter);
             break;
         case 'back-to-collection-detail-btn': // From Detail view
             showView('collection');
             renderCollection(currentFilter);
             break;
         case 'back-to-detail-btn': // From Series view
             if (state.currentDetailComicId) {
                 showComicDetail(state.currentDetailComicId);
             } else {
                 console.warn("currentDetailComicId not set, falling back to collection.");
                 showView('collection');
                 renderCollection();
             }
             break;
     }
}

/**
 * Handles the click on the Delete button in the detail view.
 */
function handleDeleteButtonClick() {
    if (!state.currentDetailComicId) {
        console.warn("Delete button clicked but no currentDetailComicId set.");
        return;
    }
    const comicToDelete = state.comics.find(c => c.id === state.currentDetailComicId);
    if (!comicToDelete) {
         showMessage("Error: Comic to delete not found.", 'error');
         return;
    }
    // Confirmation dialog
    if (confirm(`Are you sure you want to delete ${comicToDelete.title} #${comicToDelete.issue}? This cannot be undone.`)) {
        console.log("Deleting comic with ID:", state.currentDetailComicId);
        state.comics = state.comics.filter(c => c.id !== state.currentDetailComicId);
        saveData();
        showMessage("Comic deleted.", 'success');
        renderCollection(); // Update collection view
        showView('collection'); // Go back to collection
        state.currentDetailComicId = null;
    } else {
         console.log("Deletion cancelled by user.");
    }
}

/**
 * Handles the click on the Edit button in the detail view.
 */
function handleEditButtonClick() {
     if (!state.currentDetailComicId) {
         console.warn("Edit button clicked but no currentDetailComicId set.");
         return;
     }
     const comic = state.comics.find(c => c.id === state.currentDetailComicId);
     if (comic) {
         console.log("Editing comic:", comic);
         // Populate the form
         resetForm(); // Clear first (also enables save button)
         appElements.addForm.title.textContent = 'Edit Comic';
         appElements.addForm.idInput.value = comic.id;
         appElements.addForm.titleInput.value = comic.title;
         appElements.addForm.issueInput.value = comic.issue;
         appElements.addForm.dateInput.value = comic.releaseDate || '';
         appElements.addForm.costInput.value = comic.cost || '';
         appElements.addForm.artistInput.value = comic.artist || '';
         appElements.addForm.publisherInput.value = comic.publisher || '';
         appElements.addForm.coverDataInput.value = comic.coverImage || ''; // Set hidden input
         if (comic.coverImage) {
             appElements.addForm.coverPreview.src = comic.coverImage;
             appElements.addForm.coverPreview.classList.remove('hidden');
         } else {
              resetCoverPreview(); // Ensure preview is hidden if no image
         }
         showView('add');
     } else {
         console.error("Edit button clicked, but comic not found for ID:", state.currentDetailComicId);
         showMessage("Error: Could not find comic to edit.", 'error');
     }
}

/**
 * Handles the search input changes with debouncing.
 * @param {Event} e - The input event.
 */
let searchTimeout;
function handleSearchInput(e) {
     clearTimeout(searchTimeout);
     const filterValue = e.target.value.trim();
     searchTimeout = setTimeout(() => {
         console.log("Search triggered with:", filterValue);
         renderCollection(filterValue);
     }, 300); // Debounce search input by 300ms
}

/**
 * Handles the click on the grid/list view toggle button.
 */
function handleToggleViewClick() {
     const newLayout = state.currentLayout === 'grid' ? 'list' : 'grid';
     console.log("Toggling layout view to:", newLayout);
     state.currentLayout = newLayout; // Update state
     toggleCollectionViewLayoutUI(newLayout); // Update UI immediately
     saveData(); // Save the new layout preference
}

/**
 * Toggles the read status of the currently detailed comic.
 */
function handleToggleReadClick() {
    if (!state.currentDetailComicId) return;
    const index = state.comics.findIndex(c => c.id === state.currentDetailComicId);
    if (index > -1) {
        state.comics[index].status.read = !state.comics[index].status.read;
        console.log(`Toggled read status for ${state.comics[index].title} #${state.comics[index].issue} to ${state.comics[index].status.read}`);
        saveData();
        // Re-render the detail view ONLY to show updated button/status
        showComicDetail(state.currentDetailComicId);
        showMessage(`Marked as ${state.comics[index].status.read ? 'Read' : 'Unread'}.`, 'info');
    } else {
         console.error("Could not find comic to toggle read status for ID:", state.currentDetailComicId);
    }
}

/**
 * Handles the click on the "View Series" button in the detail view.
 */
function handleViewSeriesClick() {
     if (!state.currentDetailComicId) return;
     const comic = state.comics.find(c => c.id === state.currentDetailComicId);
     if (comic) {
         showSeriesView(comic.title, comic.id);
     } else {
         console.error("Could not find comic to view series for ID:", state.currentDetailComicId);
     }
}

/**
 * Toggles the want status of an issue. Adds if not present (and not owned), removes if present.
 * @param {string} title - The title of the comic series.
 * @param {string} issue - The issue number (as a string).
 */
 function toggleWantStatus(title, issue) {
     const lowerTitle = title.toLowerCase();
     const issueStr = String(issue); // Ensure comparison is string vs string
     const wantIndex = state.wantsList.findIndex(w => w.title.toLowerCase() === lowerTitle && String(w.issue) === issueStr);

     if (wantIndex > -1) {
         // --- Issue is currently wanted: Remove it ---
         state.wantsList.splice(wantIndex, 1);
         console.log(`Removed ${title} #${issueStr} from wants list.`);
         showMessage(`Removed ${title} #${issueStr} from wishlist.`, 'info');
     } else {
         // --- Issue is not wanted: Add it (if not owned) ---
         const isOwned = state.comics.some(c => c.title.toLowerCase() === lowerTitle && String(c.issue) === issueStr);
         if (isOwned) {
             console.warn(`Attempted to add owned comic ${title} #${issueStr} to wants list.`);
             showMessage(`You already own ${title} #${issueStr}.`, 'info');
             return; // Don't add owned comics to wants
         }
         state.wantsList.push({ title, issue: issueStr });
         console.log(`Added ${title} #${issueStr} to wants list.`);
         showMessage(`Added ${title} #${issueStr} to wishlist.`, 'success');
     }
     saveData();
     // Note: The series view needs to be re-rendered manually after calling this if it's currently visible
 }

 /**
  * Removes an item from the wants list if it exists.
  * @param {string} title - The title of the comic series.
  * @param {string} issue - The issue number (as a string).
  * @returns {boolean} - True if an item was removed, false otherwise.
  */
 function removeWantIfExists(title, issue) {
     const lowerTitle = title.toLowerCase();
     const issueStr = String(issue); // Ensure comparison is string vs string
     const wantIndex = state.wantsList.findIndex(w => w.title.toLowerCase() === lowerTitle && String(w.issue) === issueStr);
     if (wantIndex > -1) {
         state.wantsList.splice(wantIndex, 1);
         console.log(`Removed ${title} #${issueStr} from wants list automatically.`);
         return true;
     }
     return false;
 }


// ========================================================================
// Initialization
// ========================================================================

/**
 * Sets up initial event listeners for the application.
 */
function initializeEventListeners() {
    appElements.addForm.form.addEventListener('submit', handleComicFormSubmit);
    appElements.addForm.coverUpload.addEventListener('change', handleCoverImageChange);
    appElements.navigation.navButtons.forEach(button => button.addEventListener('click', handleNavButtonClick));
    appElements.navigation.scanBtn.addEventListener('click', handleScanButtonClick);
    appElements.navigation.backToAddBtn.addEventListener('click', handleBackButtonClick);
    appElements.detail.backBtn.addEventListener('click', handleBackButtonClick);
    appElements.series.backBtn.addEventListener('click', handleBackButtonClick);
    appElements.detail.editBtn.addEventListener('click', handleEditButtonClick);
    appElements.detail.deleteBtn.addEventListener('click', handleDeleteButtonClick);
    appElements.collection.searchInput.addEventListener('input', handleSearchInput);
    appElements.collection.toggleViewBtn.addEventListener('click', handleToggleViewClick);
}

/**
 * Main application initialization function.
 */
function initializeApp() {
    console.log("Initializing ComicTrackr App...");
    loadData(); // Load data first
    initializeEventListeners(); // Then set up listeners
    showView('collection'); // Show initial view (calls updateNavButtonsUI)
    renderCollection(); // Render initial collection
    console.log("ComicTrackr App Initialized.");
}

// --- Start the application once the DOM is ready ---
document.addEventListener('DOMContentLoaded', initializeApp);

</script>
</body>
</html>
