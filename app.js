const GEMINI_API_KEY = 'AIzaSyB9SsnDs9-9YNX5RvcDiLeshKgNGc8R-5c';

class NotesApp {
    constructor() {
        this.notes = JSON.parse(localStorage.getItem('notes')) || [];
        this.theme = localStorage.getItem('theme') || 'light';
        this.initializeApp();
    }

    initializeApp() {
        this.applyTheme();
        this.attachEventListeners();
        this.renderNotes();
    }

    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.theme);
        this.updateThemeIcon();
    }

    updateThemeIcon() {
        const themeBtn = document.getElementById('theme-btn');
        const themeIcon = themeBtn.querySelector('.material-icons');
        themeIcon.textContent = this.theme === 'dark' ? 'light_mode' : 'dark_mode';
    }

    attachEventListeners() {
        const themeBtn = document.getElementById('theme-btn');
        const htmlElement = document.documentElement;
        const themeIcon = themeBtn.querySelector('.material-icons');

        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            htmlElement.setAttribute('data-theme', savedTheme);
            this.theme = savedTheme;
            this.updateThemeIcon();
        }

        themeBtn.addEventListener('click', () => {
            const currentTheme = htmlElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            htmlElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            this.theme = newTheme;
            this.updateThemeIcon();
        });

        document.getElementById('new-note').addEventListener('click', () => {
            document.querySelector('.note-editor').classList.toggle('hidden');
        });

        document.getElementById('save-note').addEventListener('click', () => {
            this.saveNote();
        });

        document.getElementById('cancel-note').addEventListener('click', () => {
            this.resetEditor();
            document.querySelector('.note-editor').classList.add('hidden');
        });

        document.getElementById('search-notes').addEventListener('input', (e) => {
            this.filterNotes(e.target.value);
        });

        document.getElementById('sort-notes').addEventListener('change', (e) => {
            this.sortNotes(e.target.value);
        });

        document.getElementById('note-content').addEventListener('input', (e) => {
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
        });

        const infoBtn = document.getElementById('info-btn');
        const tooltipContent = document.querySelector('.tooltip-content');
        let isTooltipVisible = false;

        infoBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            isTooltipVisible = !isTooltipVisible;
            tooltipContent.style.display = isTooltipVisible ? 'block' : 'none';
        });

        tooltipContent.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        document.addEventListener('click', () => {
            isTooltipVisible = false;
            tooltipContent.style.display = 'none';
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                isTooltipVisible = false;
                tooltipContent.style.display = 'none';
            }
        });

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'data-theme') {
                    const theme = htmlElement.getAttribute('data-theme');
                    tooltipContent.style.backgroundColor = theme === 'dark' ? 'var(--surface-color)' : 'white';
                    tooltipContent.style.color = theme === 'dark' ? 'var(--text-color)' : 'inherit';
                }
            });
        });

        observer.observe(htmlElement, { attributes: true });
    }

    saveNote() {
        const title = document.getElementById('note-title').value;
        const content = document.getElementById('note-content').value;
        const tagsInput = document.getElementById('note-tags').value;
        
        const tags = tagsInput ? tagsInput
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag) : [];

        if (!title || !content) {
            alert('Please fill in both title and content');
            return;
        }

        if (this.editingNoteId) {
            const noteIndex = this.notes.findIndex(note => note.id === this.editingNoteId);
            if (noteIndex !== -1) {
                this.notes[noteIndex] = {
                    ...this.notes[noteIndex],
                    title,
                    content,
                    tags,
                    lastEdited: new Date().toISOString()
                };
            }
            this.editingNoteId = null; 
        } else {
            const note = {
                id: Date.now(),
                title,
                content,
                tags,
                date: new Date().toISOString()
            };
            this.notes.unshift(note);
        }

        localStorage.setItem('notes', JSON.stringify(this.notes));
        this.resetEditor();
        this.renderNotes();
        document.querySelector('.note-editor').classList.add('hidden');
        document.getElementById('save-note').textContent = 'Save Note';
    }

    renderNotes() {
        const container = document.getElementById('notes-grid');
        container.innerHTML = '';

        this.notes.forEach(note => {
            const noteElement = this.createNoteElement(note);
            container.appendChild(noteElement);
        });
    }

    createNoteElement(note) {
        const div = document.createElement('div');
        div.className = 'note-card';
        
        const previewContent = note.content
            .replace(/```[\s\S]*?```/g, '[Code Block]')
            .replace(/`[^`]+`/g, '[Code]')
            .substring(0, 100) + (note.content.length > 100 ? '...' : '');
        
        div.innerHTML = `
            <div class="note-actions">
                <button class="icon-btn edit-btn" title="Edit">
                    <span class="material-icons">edit</span>
                </button>
                <button class="icon-btn delete-btn" title="Delete">
                    <span class="material-icons">delete</span>
                </button>
            </div>
            <h3>${note.title}</h3>
            <p class="note-date">${new Date(note.date).toLocaleDateString()}</p>
            <p class="note-preview">${previewContent}</p>
            <div class="note-tags">
                ${note.tags && note.tags.length > 0 ? 
                    note.tags.map(tag => `<span class="tag">${tag}</span>`).join('') : 
                    ''}
            </div>
        `;

        renderMathInElement(div.querySelector('.note-preview'), {
            delimiters: [
                {left: '$$', right: '$$', display: true},
                {left: '$', right: '$', display: false}
            ]
        });

        div.querySelector('.edit-btn').addEventListener('click', (e) => {
            e.stopPropagation(); 
            this.editNote(note);
        });

        div.querySelector('.delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteNote(note.id);
        });

        div.addEventListener('click', () => this.showNoteModal(note));
        return div;
    }

    async showNoteModal(note) {
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        
        const modalContainer = document.createElement('div');
        modalContainer.className = 'modal-container';

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        modalContent.innerHTML = `
            <div class="modal-header">
                <h2 class="modal-title">${note.title}</h2>
                <button class="close-btn">×</button>
            </div>
            <div class="modal-body">
                <p class="note-date">${new Date(note.date).toLocaleDateString()}</p>
                <div class="note-tags">
                    ${note.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
                <div class="note-full-content">
                    ${this.processContent(note.content)}
                </div>
                <button class="summary-btn">Generate Summary</button>
            </div>
        `;

        renderMathInElement(modalContent.querySelector('.note-full-content'), {
            delimiters: [
                {left: '$$', right: '$$', display: true},
                {left: '$', right: '$', display: false}
            ],
            ignoredTags: ['pre', 'code'] 
        });

        const summaryContent = document.createElement('div');
        summaryContent.className = 'summary-content';
        summaryContent.style.display = 'none';

        modalContainer.appendChild(modalContent);
        modalContainer.appendChild(summaryContent);
        modalOverlay.appendChild(modalContainer);
        document.body.appendChild(modalOverlay);

        modalContent.querySelector('.close-btn').addEventListener('click', () => {
            modalOverlay.remove();
        });

        modalContent.querySelector('.summary-btn').addEventListener('click', async () => {
            summaryContent.style.display = 'block';
            summaryContent.innerHTML = '<div class="loading">Generating summary...</div>';
            
            try {
                const summary = await this.generateSummary(note.content);
                summaryContent.innerHTML = `
                    <div class="modal-header">
                        <h2 class="modal-title">Summary</h2>
                    </div>
                    <div class="modal-body">
                        ${summary}
                    </div>
                `;
            } catch (error) {
                summaryContent.innerHTML = `
                    <div class="modal-header">
                        <h2 class="modal-title">Error</h2>
                    </div>
                    <div class="modal-body">
                        Failed to generate summary. Please try again.
                    </div>
                `;
            }
        });

        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                modalOverlay.remove();
            }
        });
    }

    async generateSummary(content) {
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Please provide a clear and concise summary of the following text, capturing its main points and key details while maintaining its original meaning. Format the response with proper paragraphs, bullet points where appropriate, and clear section headings. You can use # for h1, ## for h2, ### for h3 headers, and LaTeX notation for mathematical expressions.\n\n${content}`
                        }]
                    }]
                })
            });

            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }

            const data = await response.json();
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                let summaryText = data.candidates[0].content.parts[0].text;

                const formattedContent = summaryText
                    .split('\n')
                    .map(line => {
                        line = line.trim();
                        if (line === '') return '<br>';
                        
                        if (line.startsWith('# ')) {
                            return `<h1>${line.substring(2)}</h1>`;
                        }
                        if (line.startsWith('## ')) {
                            return `<h2>${line.substring(3)}</h2>`;
                        }
                        if (line.startsWith('### ')) {
                            return `<h3>${line.substring(4)}</h3>`;
                        }

                        line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                            .replace(/__(.*?)__/g, '<strong>$1</strong>');

                        if (line.match(/^[•\-\*]\s/)) {
                            let content = line.replace(/^[•\-\*]\s/, '');
                            content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                .replace(/__(.*?)__/g, '<strong>$1</strong>');
                            return `<li>${content}</li>`;
                        }

                        if (line.match(/^[A-Z].*:/)) {
                            return `<h3>${line}</h3>`;
                        }
                        
                        return `<p>${line}</p>`;
                    })
                    .join('')
                    .replace(/(<li>.*?<\/li>)+/g, match => `<ul>${match}</ul>`); 

                const summaryContainer = document.createElement('div');
                summaryContainer.innerHTML = formattedContent;

                renderMathInElement(summaryContainer, {
                    delimiters: [
                        {left: '$$', right: '$$', display: true},
                        {left: '$', right: '$', display: false}
                    ]
                });

                return summaryContainer.innerHTML;
            } else {
                throw new Error('Invalid API response format');
            }
        } catch (error) {
            console.error('Error generating summary:', error);
            return '<p>Failed to generate summary. Please check your API key and try again.</p>';
        }
    }

    editNote(note) {
        this.editingNoteId = note.id;
        
        document.getElementById('note-title').value = note.title;
        document.getElementById('note-content').value = note.content;
        document.getElementById('note-tags').value = note.tags.join(', ');
        
        document.querySelector('.note-editor').classList.remove('hidden');
        
        document.getElementById('save-note').textContent = 'Update Note';
    }

    deleteNote(noteId) {
        if (confirm('Are you sure you want to delete this note?')) {
            this.notes = this.notes.filter(note => note.id !== noteId);
            localStorage.setItem('notes', JSON.stringify(this.notes));
            this.renderNotes();
        }
    }

    filterNotes(searchTerm) {
        const filtered = this.notes.filter(note => 
            note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
            note.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        this.renderFilteredNotes(filtered);
    }

    sortNotes(sortMethod) {
        const sorted = [...this.notes];
        sorted.sort((a, b) => {
            if (sortMethod === 'oldest') {
                return new Date(a.date) - new Date(b.date);
            }
            return new Date(b.date) - new Date(a.date);
        });
        this.renderFilteredNotes(sorted);
    }

    renderFilteredNotes(notes) {
        const container = document.getElementById('notes-grid');
        container.innerHTML = '';
        notes.forEach(note => {
            const noteElement = this.createNoteElement(note);
            container.appendChild(noteElement);
        });
    }

    resetEditor() {
        this.editingNoteId = null;
        document.getElementById('note-title').value = '';
        document.getElementById('note-content').value = '';
        document.getElementById('note-tags').value = '';
        document.getElementById('save-note').textContent = 'Save Note';
    }

    processContent(content) {
        content = content.replace(/```(\w*)\n([\s\S]*?)```/g, (match, language, code) => {
            const lang = language || 'plaintext';
            const highlightedCode = Prism.highlight(
                code.trim(),
                Prism.languages[lang] || Prism.languages.plaintext,
                lang
            );
            return `<pre><code class="language-${lang}">${highlightedCode}</code></pre>`;
        });

        content = content.replace(/`([^`]+)`/g, '<code>$1</code>');

        return content.split('\n').map(p => {
            if (p.trim().startsWith('<pre>')) {
                return p; 
            }
            return `<p>${p}</p>`;
        }).join('');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new NotesApp();
});