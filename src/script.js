/**
 * Text Editor
 * A powerful text manipulation tool with real-time processing
 * @version 3.2.0
 */

'use strict';

// ============================================
// DOM Elements
// ============================================
const elements = {};

function initElements() {
    const ids = [
        'inputText', 'resultText', 'addPrefix', 'addSuffix',
        'replaceBtn', 'splitBtn', 'sortBtn', 'removeBtn',
        'replaceMenu', 'splitMenu', 'sortMenu', 'removeMenu',
        'listBtn', 'commaBtn', 'phpBtn', 'jsBtn', 'jsonBtn',
        'clearInputBtn', 'copyResultBtn', 'applyResultBtn',
        'undoBtn', 'redoBtn', 'inputHeader', 'resultHeader',
        'charCount', 'lineCount', 'wordCount'
    ];
    
    ids.forEach(id => {
        elements[id] = document.getElementById(id);
        if (!elements[id]) {
            console.error(`Element #${id} not found`);
        }
    });
}

// ============================================
// State
// ============================================
const state = {
    currentFormat: localStorage.getItem('textEditorFormat') || 'list',
    isProcessing: false,
    undoStack: [],
    redoStack: [],
    MAX_HISTORY: 50,
    prefix: '',
    suffix: ''
};

// ============================================
// Update text statistics
// ============================================
function updateTextStats() {
    const text = elements.inputText.value;
    
    // Count characters
    const charCount = text.length;
    
    // Count lines
    const lines = text.split('\n');
    const lineCount = text === '' ? 0 : lines.length;
    
    // Count words
    const words = text.trim().split(/\s+/);
    const wordCount = text.trim() === '' ? 0 : words.length;
    
    // Update display
    elements.charCount.textContent = charCount.toLocaleString();
    elements.lineCount.textContent = lineCount.toLocaleString();
    elements.wordCount.textContent = wordCount.toLocaleString();
}

// ============================================
// INSTANT text processing
// ============================================
function processTextInstant() {
    const text = elements.inputText.value;
    const prefix = elements.addPrefix.value;
    const suffix = elements.addSuffix.value;
    
    // Cache prefix/suffix
    state.prefix = prefix;
    state.suffix = suffix;
    
    let result;
    
    if (!prefix && !suffix) {
        result = text;
    } else {
        const lines = text.split('\n');
        result = lines.map(line => {
            return line.trim() ? prefix + line + suffix : line;
        }).join('\n');
    }
    
    // Apply format
    result = applyFormat(result);
    
    // Instant update via textContent
    elements.resultText.textContent = result;
    
    // Update statistics
    updateTextStats();
    
    // Save
    saveState();
}

// Apply format
function applyFormat(text) {
    if (!text) return '';
    
    switch(state.currentFormat) {
        case 'list':
            return text;
            
        case 'comma':
            return text.split('\n')
                .filter(line => line.trim())
                .join(', ');
            
        case 'php':
            const phpLines = text.split('\n').filter(line => line.trim());
            if (!phpLines.length) return '';
            return "<?php\n$array = array(\n" +
                phpLines.map(line => `    "${line.replace(/"/g, '\\"')}"`).join(",\n") +
                "\n);\n?>";
            
        case 'js':
            const jsLines = text.split('\n').filter(line => line.trim());
            if (!jsLines.length) return '';
            return "const array = [\n" +
                jsLines.map(line => `    "${line.replace(/"/g, '\\"')}"`).join(",\n") +
                "\n];";
            
        case 'json':
            const jsonLines = text.split('\n').filter(line => line.trim());
            return JSON.stringify(jsonLines, null, 2);
    }
}

// ============================================
// Save state
// ============================================
function saveState() {
    try {
        const data = {
            input: elements.inputText.value,
            result: elements.resultText.textContent,
            prefix: elements.addPrefix.value,
            suffix: elements.addSuffix.value,
            format: state.currentFormat,
            timestamp: Date.now()
        };
        localStorage.setItem('textEditorState', JSON.stringify(data));
    } catch(e) {}
}

function loadState() {
    try {
        const data = JSON.parse(localStorage.getItem('textEditorState'));
        if (data) {
            elements.inputText.value = data.input || '';
            elements.resultText.textContent = data.result || '';
            elements.addPrefix.value = data.prefix || '';
            elements.addSuffix.value = data.suffix || '';
            state.currentFormat = data.format || 'list';
            return true;
        }
    } catch(e) {}
    return false;
}

// ============================================
// History (undo/redo)
// ============================================
function saveToHistory(text) {
    if (state.undoStack.length && state.undoStack[state.undoStack.length - 1] === text) {
        return;
    }
    
    state.undoStack.push(text);
    if (state.undoStack.length > state.MAX_HISTORY) {
        state.undoStack.shift();
    }
    state.redoStack = [];
    updateUndoRedoButtons();
}

function undo() {
    if (!state.undoStack.length) return;
    
    const current = elements.inputText.value;
    state.redoStack.push(current);
    
    const previous = state.undoStack.pop();
    elements.inputText.value = previous;
    processTextInstant();
    updateTextStats();
    updateUndoRedoButtons();
}

function redo() {
    if (!state.redoStack.length) return;
    
    const current = elements.inputText.value;
    state.undoStack.push(current);
    
    const next = state.redoStack.pop();
    elements.inputText.value = next;
    processTextInstant();
    updateTextStats();
    updateUndoRedoButtons();
}

function updateUndoRedoButtons() {
    elements.undoBtn.classList.toggle('enabled', state.undoStack.length > 0);
    elements.redoBtn.classList.toggle('enabled', state.redoStack.length > 0);
}

// ============================================
// Menus
// ============================================
function toggleMenu(menu) {
    const isOpen = menu.classList.contains('show');
    closeAllMenus();
    if (!isOpen) menu.classList.add('show');
}

function closeAllMenus() {
    document.querySelectorAll('.dropdown-menu.show').forEach(m => m.classList.remove('show'));
}

// ============================================
// Text actions
// ============================================
function doAction(action, type) {
    saveToHistory(elements.inputText.value);
    
    let lines = elements.inputText.value.split('\n');
    
    switch(type) {
        case 'replace':
            lines = applyReplace(lines, action);
            break;
        case 'split':
            lines = applySplit(lines, action);
            break;
        case 'sort':
            lines = applySort(lines, action);
            break;
        case 'remove':
            lines = applyRemove(lines, action);
            break;
    }
    
    elements.inputText.value = lines.join('\n');
    processTextInstant();
}

function applyReplace(lines, action) {
    const text = lines.join('\n');
    let result;
    
    switch(action) {
        case 'uppercase': result = text.toUpperCase(); break;
        case 'lowercase': result = text.toLowerCase(); break;
        case 'capitalizeFirst': result = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase(); break;
        case 'capitalizeWords': result = text.replace(/\b\w/g, c => c.toUpperCase()); break;
        case 'invertCase': result = text.split('').map(char => char === char.toUpperCase() ? char.toLowerCase() : char.toUpperCase()).join(''); break;
        case 'singleToDouble': result = text.replace(/'/g, '"'); break;
        case 'doubleToSingle': result = text.replace(/"/g, "'"); break;
        case 'singleToGuillemets': result = text.replace(/'([^']*)'/g, '«$1»'); break;
        case 'doubleToGuillemets': result = text.replace(/"([^"]*)"/g, '«$1»'); break;
        case 'ampToAmp': result = text.replace(/&amp;/g, '&'); break;
        default: result = text;
    }
    
    return result.split('\n');
}

function applySplit(lines, action) {
    const text = lines.join('\n');
    const separators = { splitComma: ',', splitDot: '.', splitSpace: ' ', splitTab: '\t' };
    const sep = separators[action];
    return sep ? text.split(sep) : lines;
}

function applySort(lines, action) {
    const filtered = lines.filter(l => l.trim());
    
    switch(action) {
        case 'sortAZ': filtered.sort((a, b) => a.localeCompare(b)); break;
        case 'sortZA': filtered.sort((a, b) => b.localeCompare(a)); break;
        case 'sortLengthAsc': filtered.sort((a, b) => a.length - b.length); break;
        case 'sortLengthDesc': filtered.sort((a, b) => b.length - a.length); break;
        case 'shuffle': 
            for (let i = filtered.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
            }
            break;
    }
    
    return filtered;
}

function applyRemove(lines, action) {
    switch(action) {
        case 'removeDuplicates': return [...new Set(lines)];
        case 'removeEmpty': return lines.filter(l => l.trim());
        case 'noDefis': return lines.map(l => l.replace(/-/g, ''));
        case 'removeNumbers': return lines.map(l => l.replace(/\d/g, ''));
        case 'removeWordsEn': return lines.map(l => l.replace(/[a-zA-Z]/g, ''));
        case 'removeWordsRu': return lines.map(l => l.replace(/[а-яА-ЯёЁ]/g, ''));
        case 'removeWordsAll': return lines.map(l => l.replace(/[a-zA-Zа-яА-ЯёЁ]/g, ''));
        case 'removeCharAll': return lines.map(l => l.replace(/[^\w\s]/g, ''));
        case 'removeChar1': return lines.map(l => l.replace(/'/g, ''));
        case 'removeChar2': return lines.map(l => l.replace(/"/g, ''));
        case 'removeChar3': return lines.map(l => l.replace(/,/g, ''));
        case 'removeChar4': return lines.map(l => l.replace(/\./g, ''));
        case 'removeChar5': return lines.map(l => l.replace(/;/g, ''));
        case 'removeSpaceClear': return lines.map(l => l.replace(/\s+/g, ' ').trim());
        case 'removeSpaceLtrim': return lines.map(l => l.replace(/^\s+/, ''));
        case 'removeSpaceRtrim': return lines.map(l => l.replace(/\s+$/, ''));
        case 'removeSpaceTrim': return lines.map(l => l.trim());
        case 'removeSpaceDuble': return lines.map(l => l.replace(/  +/g, ' '));
        case 'removeSpaceAll': return lines.map(l => l.replace(/\s/g, ''));
        case 'removeTagAll': return lines.map(l => l.replace(/<[^>]*>/g, ''));
        case 'removeTagDiv': return lines.map(l => l.replace(/<\/?div[^>]*>/g, ''));
        case 'removeTagP': return lines.map(l => l.replace(/<\/?p[^>]*>/g, ''));
        case 'removeTagUl': return lines.map(l => l.replace(/<\/?ul[^>]*>/g, ''));
        case 'removeTagLi': return lines.map(l => l.replace(/<\/?li[^>]*>/g, ''));
        case 'removeTagTr': return lines.map(l => l.replace(/<\/?tr[^>]*>/g, ''));
        case 'removeTagTd': return lines.map(l => l.replace(/<\/?td[^>]*>/g, ''));
        case 'removeTagSpan': return lines.map(l => l.replace(/<\/?span[^>]*>/g, ''));
        case 'removeTagI': return lines.map(l => l.replace(/<\/?i[^>]*>/g, ''));
        case 'removeTagFont': return lines.map(l => l.replace(/<\/?font[^>]*>/g, ''));
        case 'removeTagB': return lines.map(l => l.replace(/<\/?b[^>]*>/g, ''));
        case 'removeTagStrong': return lines.map(l => l.replace(/<\/?strong[^>]*>/g, ''));
        case 'removeTagEm': return lines.map(l => l.replace(/<\/?em[^>]*>/g, ''));
        case 'removeTagA': return lines.map(l => l.replace(/<\/?a[^>]*>/g, ''));
        case 'removeStartMarks': return lines.map(l => l.replace(/^[^\w\s]+/, ''));
        case 'removeEndMarks': return lines.map(l => l.replace(/[^\w\s]+$/, ''));
        case 'removeStartTab': return lines.map(l => l.replace(/^\t+/, ''));
        case 'removeEndTab': return lines.map(l => l.replace(/\t+$/, ''));
        case 'removeBeforeSpace': return lines.map(l => l.replace(/.*(?=\s)/, ''));
        case 'removeBeforeTab': return lines.map(l => l.replace(/.*(?=\t)/, ''));
        case 'removeAfterSpace': return lines.map(l => l.replace(/(?<=\s).*/, ''));
        case 'removeAfterTab': return lines.map(l => l.replace(/(?<=\t).*/, ''));
        default: return lines;
    }
}

// ============================================
// Output format
// ============================================
function setOutputFormat(format) {
    state.currentFormat = format;
    localStorage.setItem('textEditorFormat', format);
    
    document.querySelectorAll('.format-btn').forEach(b => b.classList.remove('active'));
    
    const btnMap = {
        'list': elements.listBtn,
        'comma': elements.commaBtn,
        'php': elements.phpBtn,
        'js': elements.jsBtn,
        'json': elements.jsonBtn
    };
    
    if (btnMap[format]) btnMap[format].classList.add('active');
    
    processTextInstant();
}

// ============================================
// Event initialization
// ============================================
function setupEvents() {
    // Main - instant processing on input
    elements.inputText.addEventListener('input', processTextInstant);
    elements.addPrefix.addEventListener('input', processTextInstant);
    elements.addSuffix.addEventListener('input', processTextInstant);
    
    // Menu buttons
    elements.replaceBtn.onclick = () => toggleMenu(elements.replaceMenu);
    elements.splitBtn.onclick = () => toggleMenu(elements.splitMenu);
    elements.sortBtn.onclick = () => toggleMenu(elements.sortMenu);
    elements.removeBtn.onclick = () => toggleMenu(elements.removeMenu);
    
    // Close menus
    document.addEventListener('click', e => {
        if (!e.target.closest('.tool-group')) closeAllMenus();
    });
    
    // Format
    elements.listBtn.onclick = () => setOutputFormat('list');
    elements.commaBtn.onclick = () => setOutputFormat('comma');
    elements.phpBtn.onclick = () => setOutputFormat('php');
    elements.jsBtn.onclick = () => setOutputFormat('js');
    elements.jsonBtn.onclick = () => setOutputFormat('json');
    
    // Clear
    elements.clearInputBtn.onclick = () => {
        saveToHistory(elements.inputText.value);
        elements.inputText.value = '';
        processTextInstant();
    };
    
    // Copy
    elements.copyResultBtn.onclick = async () => {
        try {
            await navigator.clipboard.writeText(elements.resultText.textContent);
            elements.copyResultBtn.classList.add('copied');
            setTimeout(() => elements.copyResultBtn.classList.remove('copied'), 2000);
        } catch(e) {
            console.error('Copy failed:', e);
        }
    };
    
    // Apply result
    elements.applyResultBtn.onclick = () => {
        saveToHistory(elements.inputText.value);
        elements.inputText.value = elements.resultText.textContent;
        processTextInstant();
    };
    
    // Undo/Redo
    elements.undoBtn.onclick = undo;
    elements.redoBtn.onclick = redo;
    
    // Hotkeys
    document.addEventListener('keydown', e => {
        if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); }
        if (e.ctrlKey && e.key === 'y') { e.preventDefault(); redo(); }
    });
    
    // Save on exit
    window.addEventListener('beforeunload', saveState);
    
    // Setup menu actions
    setupMenuActions();
}

function setupMenuActions() {
    const menus = {
        replaceMenu: 'replace',
        splitMenu: 'split',
        sortMenu: 'sort',
        removeMenu: 'remove'
    };
    
    Object.entries(menus).forEach(([menuId, type]) => {
        const menu = document.getElementById(menuId);
        if (!menu) return;
        
        menu.querySelectorAll('.dropdown-item[data-action]').forEach(item => {
            item.onclick = (e) => {
                e.stopPropagation();
                const action = item.dataset.action;
                doAction(action, type);
                closeAllMenus();
            };
        });
    });
}

// ============================================
// Launch
// ============================================
function init() {
    initElements();
    setupEvents();
    
    if (!loadState()) {
        processTextInstant();
    } else {
        setOutputFormat(state.currentFormat);
    }
    
    updateTextStats();
    updateUndoRedoButtons();
}

// Start
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
