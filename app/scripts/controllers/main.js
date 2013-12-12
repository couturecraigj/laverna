/*global define*/
define([
    'underscore',
    'backbone',
    'marionette',
    'app',
    // collections
    'collections/notes',
    'collections/notebooks',
    'collections/tags',
    'collections/configs',
    // Views
    'noteForm',
    'noteItem',
    'noteSidebar',
    'notebookLayout',
    'notebookSidebar',
    'notebookForm',
    'tagsSidebar',
    'tagForm'
],
function(_, Backbone, Marionette, App, CollectionNotes, CollectionNotebooks, CollectionTags, CollectionConfigs, NoteForm, NoteItem, NoteSidebar, NotebookLayout, NotebookSidebar, NotebookForm, TagsSidebar, TagForm) {
    'use strict';

    var Controller = Marionette.Controller.extend({

        /**
         * Initialization
         */
        initialize: function() {
            // Fetch notes
            this.collectionNotes = new CollectionNotes();
            this.collectionNotes.fetch({reset: true});

            // Fetch notebooks
            this.collectionNotebooks = new CollectionNotebooks();
            this.collectionNotebooks.fetch({reset: true});

            // Fetch tags
            this.collectionTags = new CollectionTags();
            this.collectionTags.fetch({reset: true});

            // Fetch configs
            this.collectionConfigs = new CollectionConfigs();
            this.collectionConfigs.fetch({reset: true});

            // Set default set of configs
            if (this.collectionConfigs.length === 0) {
                this.collectionConfigs.firstStart();
            }

            this.on('notes.shown', this.showAllNotes);
        },

        /**
         * Show list of notes in sidebar
         */
        showAllNotes: function (args) {
            var notes = this.collectionNotes.clone(),
                arg = _.extend({
                    filter : 'active',
                    title  : 'Inbox',
                    configs: this.collectionConfigs
                }, args),
                notebookMod;

            arg.notebookId = (isNaN(arg.notebookId)) ? 0 : arg.notebookId;
            arg.tagId = (isNaN(arg.tagId)) ? 0 : arg.tagId;
            arg.lastPage = (isNaN(arg.lastPage)) ? 1 : arg.lastPage;
            arg.collection = notes;

            if (arg.notebookId !== 0) {
                notebookMod = this.collectionNotebooks.get(arg.notebookId);
                arg.title = notebookMod.get('name');
            }

            App.sidebar.show(new NoteSidebar(arg));
        },

        /**
         * Index page
         */
        index: function (notebook, page) {
            App.content.reset();
            this.trigger('notes.shown', {
                notebookId : Math.floor(notebook),
                lastPage   : page
            });
        },

        /* ------------------------------
         * Notes actions
         * ------------------------------ */
        // Show notes content
        showNoteContent: function (id) {
            if (id !== undefined) {
                App.content.show(new NoteItem({
                    model: this.collectionNotes.get(id),
                    collection: this.collectionNotes,
                    configs: this.collectionConfigs
                }));
            } else {
                App.content.reset();
            }
        },

        /**
         * Search specific note
         */
        noteSearch: function (query, page, id) {
            this.trigger('notes.shown', {
                filter      : 'search',
                searchQuery : query,
                title       : 'Search',
                lastPage    : page
            });

            this.showNoteContent(id);
        },

        /**
         * Show favorite notes
         */
        noteFavorite: function (page, id) {
            this.trigger('notes.shown', {
                filter   : 'favorite',
                title    : 'Favorite notes',
                lastPage : page
            });

            this.showNoteContent(id);
        },

        /**
         * Show notes which is deleted
         */
        noteTrashed: function (page, id) {
            this.trigger('notes.shown', {
                filter   : 'trashed',
                title    : 'Removed notes',
                lastPage : page
            });

            this.showNoteContent(id);
        },

        /**
         * Show list of notes which has been tagged with :tag
         */
        noteTag: function (tag, page, id) {
            var tagModel = this.collectionTags.get(tag);
            this.trigger('notes.shown', {
                filter   : 'tagged',
                tagId    : tag,
                title    : 'Tag: ' + tagModel.get('name'),
                lastPage : page
            });

            this.showNoteContent(id);
        },

        /**
         * Show note's content
         */
        noteShow: function (notebook, page, id) {
            if (id === undefined) {
                id = notebook;
                notebook = 0;
            }

            // Show sidebar
            this.trigger('notes.shown', {
                filter     : 'active',
                page       : page,
                notebookId : Math.floor(notebook)
            });

            // Show content
            App.content.show(new NoteItem({
                model      : this.collectionNotes.get(id),
                collection : this.collectionNotes,
                configs    : this.collectionConfigs
            }));
        },

        /**
         * Add a new note
         */
        noteAdd: function () {
            // Show sidebar
            this.trigger('notes.shown');

            // Form
            var content = new NoteForm({
                collection: this.collectionNotes,
                notebooks : this.collectionNotebooks,
                collectionTags: this.collectionTags
            });

            App.content.show(content);
            document.title = 'Creating new note';
            content.trigger('shown');
        },

        /**
         * Edit an existing note
         */
        noteEdit: function (id) {
            var note, content;

            // Show Sidebar
            this.trigger('notes.shown');

            note = this.collectionNotes.get(id);
            content = new NoteForm({
                collection : this.collectionNotes,
                notebooks : this.collectionNotebooks,
                collectionTags: this.collectionTags,
                model      : note
            });

            App.content.show(content);
            document.title = 'Editing note: ' + note.get('title');
            content.trigger('shown');
        },

        /**
         * Remove Note
         */
        noteRemove: function (id) {
            var note, result, i, prev, url;

            url = '/note/' + this.notebookId + '/p' + this.pageN;
            note = this.collectionNotes.get(id);

            if (note.get('trash') === 0) {
                result = note.save({'trash': 1});

                if (result === false) {
                    url += id;
                } else if (this.collectionNotes.length > 1) {
                    i = this.collectionNotes.indexOf(note);
                    i = (i === 0) ? i : i - 1;

                    // this.collectionNotes.remove(note);
                    prev = this.collectionNotes.at(i);

                    url += prev.get('id');
                } else {
                    url = '';
                }
            } else {
                note.destroy();
                url = '/note/trashed/p' + this.pageN;
            }

            Backbone.history.navigate(url, true);
        },

        /* ------------------------------
         * Notebooks actions
         * ------------------------------ */
        notebooks: function () {
            var tags, notebook, sidebar;

            // Notebooks list
            notebook = new NotebookSidebar({
                collection : this.collectionNotebooks
            });

            // Tags list
            tags = new TagsSidebar({
                collection : this.collectionTags
            });

            // Show sidebar layout
            sidebar = new NotebookLayout({
                collectionNotebooks: this.collectionNotebooks,
                collectionTags     : this.collectionTags,
                configs            : this.collectionConfigs
            });
            App.sidebar.show(sidebar);

            // Notebooks & tags list in sidebar
            sidebar.notebooks.show(notebook);
            sidebar.tags.show(tags);

            App.content.reset();
        },

        /**
         * Add new notebook
         */
        notebookAdd: function () {
            var content = new NotebookForm({
                collection: this.collectionNotebooks
            });

            App.modal.show(content);
        },

        /**
         * Edit existing notebook
         */
        notebookEdit: function (id) {
            var notebook = this.collectionNotebooks.get(id),
                content = new NotebookForm({
                    model: notebook,
                    collection: this.collectionNotebooks
                });

            App.modal.show(content);
        },

        /**
         * Remove notebook
         */
        notebookRemove: function (id) {
            var n = this.collectionNotebooks.get(id);
            n.destroy();
            Backbone.history.navigate('#/notebooks', true);
        },

        /* ---------------------------------
         * Tags actions
         * --------------------------------- */
        tagAdd: function() {
            var content = new TagForm({
                collection: this.collectionTags
            });

            App.modal.show(content);
        },

        /**
         * Edit existing tag
         */
        tagEdit: function(id) {
            var content = new TagForm({
                collection: this.collectionTags,
                model: this.collectionTags.get(id)
            });
            App.modal.show(content);
        },

        /**
         * Remove tag
         */
        tagRemove: function (id) {
            var model = this.collectionTags.get(id);
            model.destroy();
            Backbone.history.navigate('#/notebooks', true);
        }

    });

    return Controller;
});
