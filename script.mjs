/**
 * Main application logic for Spaced Repetition Tracker
 */

import { getUserIds } from "./common.mjs";
import { getData, addData } from "./storage.mjs";
import { 
  calculateRevisionDates, 
  formatDate, 
  getTodayString, 
  isFutureDate,
  getTodayUTC,
  addYears
} from "./dates.mjs";

let currentUserId = null;

/**
 * Initialize the application when the page loads
 */
window.onload = function () {
  initializeUserDropdown();
  setupEventListeners();
  setDefaultDate();
};

/**
 * Populate the user dropdown with available users
 */
function initializeUserDropdown() {
  const userSelect = document.getElementById('user-select');
  const users = getUserIds();
  
  users.forEach(userId => {
    const option = document.createElement('option');
    option.value = userId;
    option.textContent = `User ${userId}`;
    userSelect.appendChild(option);
  });
}

/**
 * Set up event listeners for the application
 */
function setupEventListeners() {
  const userSelect = document.getElementById('user-select');
  const addTopicForm = document.getElementById('add-topic-form');
  
  userSelect.addEventListener('change', handleUserSelection);
  addTopicForm.addEventListener('submit', handleFormSubmit);
  
  // Add real-time validation on blur/change
  const topicNameInput = document.getElementById('topic-name');
  const startDateInput = document.getElementById('start-date');
  
  topicNameInput.addEventListener('blur', () => {
    const value = topicNameInput.value.trim();
    const errorElement = document.getElementById('topic-name-error');
    
    if (value && value.length > 100) {
      topicNameInput.setAttribute('aria-invalid', 'true');
      errorElement.textContent = 'Topic name must be 100 characters or less';
    } else if (topicNameInput.getAttribute('aria-invalid')) {
      topicNameInput.removeAttribute('aria-invalid');
      errorElement.textContent = '';
    }
  });
  
  startDateInput.addEventListener('change', () => {
    const value = startDateInput.value;
    const errorElement = document.getElementById('start-date-error');
    
    if (value) {
      const selectedDate = new Date(value + 'T00:00:00.000Z');
      const tenYearsAgo = addYears(getTodayUTC(), -10);
      
      if (selectedDate < tenYearsAgo) {
        startDateInput.setAttribute('aria-invalid', 'true');
        errorElement.textContent = 'Start date cannot be more than 10 years in the past';
      } else if (startDateInput.getAttribute('aria-invalid')) {
        startDateInput.removeAttribute('aria-invalid');
        errorElement.textContent = '';
      }
    }
  });
}

/**
 * Set the default date for the date picker to today
 */
function setDefaultDate() {
  const startDateInput = document.getElementById('start-date');
  startDateInput.value = getTodayString();
}

/**
 * Handle user selection from dropdown
 * @param {Event} event - The change event
 */
function handleUserSelection(event) {
  const userId = event.target.value;
  
  if (!userId) {
    // No user selected - hide sections
    hideSection('agenda-section');
    hideSection('form-section');
    currentUserId = null;
    return;
  }
  
  currentUserId = userId;
  showSection('agenda-section');
  showSection('form-section');
  displayUserAgenda(userId);
}

/**
 * Display the agenda for a specific user
 * @param {string} userId - The user ID
 */
function displayUserAgenda(userId) {
  const agendaContent = document.getElementById('agenda-content');
  const userData = getData(userId);
  
  if (!userData || userData.length === 0) {
    agendaContent.innerHTML = '<div class="no-agenda">No topics to revise yet. Add a topic below to get started!</div>';
    return;
  }
  
  // Filter future dates and sort chronologically
  const futureRevisions = userData
    .filter(item => isFutureDate(new Date(item.date)))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  
  if (futureRevisions.length === 0) {
    agendaContent.innerHTML = '<div class="no-agenda">No upcoming revisions. All topics are up to date!</div>';
    return;
  }
  
  // Create agenda display
  const agendaHTML = futureRevisions
    .map(item => `
      <div class="agenda-item">
        <div class="agenda-date">${formatDate(new Date(item.date))}</div>
        <div class="agenda-topic">${escapeHtml(item.topic)}</div>
      </div>
    `)
    .join('');
  
  agendaContent.innerHTML = agendaHTML;
}

/**
 * Handle form submission for adding a new topic
 * @param {Event} event - The submit event
 */
function handleFormSubmit(event) {
  event.preventDefault();
  
  if (!currentUserId) {
    showError('topic-name-error', 'Please select a user first');
    document.getElementById('user-select').focus();
    return;
  }
  
  const formData = new FormData(event.target);
  const topicName = formData.get('topicName').trim();
  const startDate = formData.get('startDate');
  
  // Clear previous error messages
  clearErrorMessages();
  
  // Validate form - ensure both fields are checked
  let isValid = true;
  
  // Check topic name
  if (!topicName) {
    showError('topic-name-error', 'Topic name is required');
    isValid = false;
  } else if (topicName.length > 100) {
    showError('topic-name-error', 'Topic name must be 100 characters or less');
    isValid = false;
  }
  
  // Check start date
  if (!startDate) {
    showError('start-date-error', 'Start date is required');
    isValid = false;
  } else {
    // Check if date is too far in the past (more than 10 years)
    const selectedDate = new Date(startDate + 'T00:00:00.000Z');
    const tenYearsAgo = addYears(getTodayUTC(), -10);
    
    if (selectedDate < tenYearsAgo) {
      showError('start-date-error', 'Start date cannot be more than 10 years in the past');
      isValid = false;
    }
  }
  
  // Stop if validation failed
  if (!isValid) {
    return;
  }
  
  try {
    // Calculate revision dates
    const revisionDates = calculateRevisionDates(startDate);
    
    // Create agenda items
    const agendaItems = revisionDates.map(date => ({
      topic: topicName,
      date: date.toISOString(),
      startDate: startDate
    }));
    
    // Store the data
    addData(currentUserId, agendaItems);
    
    // Clear form
    event.target.reset();
    setDefaultDate();
    
    // Refresh agenda display
    displayUserAgenda(currentUserId);
    
    // Announce success to screen readers
    announceToScreenReader(`Topic "${topicName}" added successfully with ${revisionDates.length} revision dates.`);
    
  } catch (error) {
    console.error('Error adding topic:', error);
    showError('start-date-error', 'Invalid date selected');
  }
}

/**
 * Show an error message
 * @param {string} errorElementId - The ID of the error element
 * @param {string} message - The error message
 */
function showError(errorElementId, message) {
  const errorElement = document.getElementById(errorElementId);
  errorElement.textContent = message;
  
  // Set focus to the related input and mark as invalid
  const inputId = errorElementId.replace('-error', '');
  const input = document.getElementById(inputId);
  if (input) {
    input.focus();
    input.setAttribute('aria-invalid', 'true');
  }
}

/**
 * Clear all error messages
 */
function clearErrorMessages() {
  const errorElements = document.querySelectorAll('.error-message');
  errorElements.forEach(element => {
    element.textContent = '';
  });
  
  // Remove aria-invalid attributes
  const inputs = document.querySelectorAll('input[aria-invalid]');
  inputs.forEach(input => {
    input.removeAttribute('aria-invalid');
  });
}

/**
 * Show a section
 * @param {string} sectionId - The ID of the section to show
 */
function showSection(sectionId) {
  const section = document.getElementById(sectionId);
  section.style.display = 'block';
}

/**
 * Hide a section
 * @param {string} sectionId - The ID of the section to hide
 */
function hideSection(sectionId) {
  const section = document.getElementById(sectionId);
  section.style.display = 'none';
}

/**
 * Escape HTML to prevent XSS
 * @param {string} unsafe - The unsafe string
 * @returns {string} - The escaped string
 */
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Announce a message to screen readers
 * @param {string} message - The message to announce
 */
function announceToScreenReader(message) {
  const announcement = document.createElement('div');
  announcement.textContent = message;
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  
  document.body.appendChild(announcement);
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}
