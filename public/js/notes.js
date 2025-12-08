// Notes functionality
document.addEventListener('DOMContentLoaded', function () {
    const noteForm = document.getElementById('noteForm');
    const notesList = document.getElementById('notesList');
    const noteEditor = document.getElementById('noteEditor');
    const saveNoteBtn = document.getElementById('saveNote');
    const cancelNoteBtn = document.getElementById('cancelNote');

    let currentNoteId = null;
    let currentVideoPlayer = null;

    // Initialize note editor
    if (noteForm) {
        noteForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            await saveNote();
        });
    }

    if (saveNoteBtn) {
        saveNoteBtn.addEventListener('click', saveNote);
    }

    if (cancelNoteBtn) {
        cancelNoteBtn.addEventListener('click', function () {
            closeNoteEditor();
        });
    }

    // Quick note button (can be added to video player or resource page)
    const quickNoteBtn = document.getElementById('quickNoteBtn');
    if (quickNoteBtn) {
        quickNoteBtn.addEventListener('click', function () {
            openNoteEditor();
        });
    }

    async function saveNote() {
        const title = document.getElementById('noteTitle').value;
        const content = document.getElementById('noteContent').value;
        const tags = document.getElementById('noteTags').value;
        const color = document.getElementById('noteColor').value;

        if (!title || !content) {
            showNotification('Please enter title and content', 'warning');
            return;
        }

        const noteData = {
            title,
            content,
            tags,
            color
        };

        // Get video timestamp if video is playing
        if (currentVideoPlayer) {
            noteData.videoTimestamp = Math.floor(currentVideoPlayer.currentTime);
        }

        // Get resource or course ID from page
        const resourceId = document.getElementById('resourceId')?.value;
        const courseId = document.getElementById('courseId')?.value;
        const lessonId = document.getElementById('lessonId')?.value;

        if (resourceId) noteData.resourceId = resourceId;
        if (courseId) noteData.courseId = courseId;
        if (lessonId) noteData.lessonId = lessonId;

        try {
            const url = currentNoteId ? `/notes/${currentNoteId}` : '/notes';
            const method = currentNoteId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(noteData)
            });

            const data = await response.json();

            if (data.success) {
                showNotification(data.message, 'success');
                closeNoteEditor();

                // Reload notes list if on notes page
                if (notesList) {
                    loadNotes();
                }
            } else {
                showNotification(data.error || 'Error saving note', 'error');
            }
        } catch (error) {
            console.error('Save note error:', error);
            showNotification('Error saving note', 'error');
        }
    }

    async function loadNotes() {
        try {
            const params = new URLSearchParams(window.location.search);
            const response = await fetch(`/notes?${params.toString()}`);
            // This will reload the page - in a full SPA this would update the DOM
            window.location.reload();
        } catch (error) {
            console.error('Load notes error:', error);
        }
    }

    function openNoteEditor(noteId = null) {
        currentNoteId = noteId;

        if (noteEditor) {
            noteEditor.style.display = 'block';

            if (noteId) {
                // Load existing note
                loadNote(noteId);
            } else {
                // Clear form for new note
                document.getElementById('noteTitle').value = '';
                document.getElementById('noteContent').value = '';
                document.getElementById('noteTags').value = '';
                document.getElementById('noteColor').value = '#FFD93D';
            }
        }
    }

    function closeNoteEditor() {
        if (noteEditor) {
            noteEditor.style.display = 'none';
        }
        currentNoteId = null;

        // Clear form
        if (noteForm) {
            noteForm.reset();
        }
    }

    async function loadNote(noteId) {
        try {
            const response = await fetch(`/notes/${noteId}`);
            const note = await response.json();

            document.getElementById('noteTitle').value = note.title;
            document.getElementById('noteContent').value = note.content;
            document.getElementById('noteTags').value = note.tags ? note.tags.join(', ') : '';
            document.getElementById('noteColor').value = note.color || '#FFD93D';
        } catch (error) {
            console.error('Load note error:', error);
            showNotification('Error loading note', 'error');
        }
    }

    // Delete note
    window.deleteNote = async function (noteId) {
        if (!confirm('Are you sure you want to delete this note?')) {
            return;
        }

        try {
            const response = await fetch(`/notes/${noteId}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                showNotification(data.message, 'success');
                loadNotes();
            } else {
                showNotification(data.error || 'Error deleting note', 'error');
            }
        } catch (error) {
            console.error('Delete note error:', error);
            showNotification('Error deleting note', 'error');
        }
    };

    // Edit note
    window.editNote = function (noteId) {
        openNoteEditor(noteId);
    };

    // Jump to video timestamp
    window.jumpToTimestamp = function (timestamp) {
        if (currentVideoPlayer) {
            currentVideoPlayer.currentTime = timestamp;
            currentVideoPlayer.play();
        }
    };

    // Initialize video player reference
    const videoPlayer = document.getElementById('videoPlayer');
    if (videoPlayer) {
        currentVideoPlayer = videoPlayer;
    }

    // Keyboard shortcut for quick note (Ctrl+N or Cmd+N)
    document.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            openNoteEditor();
        }
    });
});

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}
