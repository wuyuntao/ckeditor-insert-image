(function() {

CKEDITOR.dialog.add('insertimage', function(editor) {
    // Load image preview.
    var IMAGE = 1,
        PREVIEW = 4,
        CLEANUP = 8,
        regexGetSize = /^\s*(\d+)((px)|\%)?\s*$/i,
        regexGetSizeOrEmpty = /(^\s*(\d+)((px)|\%)?\s*$)|^$/i,
        pxLengthRegex = /^\d+px$/;

    var updatePreview = function(dialog) {
        // Don't load before onShow.
        if (!dialog.originalElement || !dialog.preview)
            return 1;

        // Read attributes and update preview;
        dialog.commitContent(PREVIEW, dialog.preview);
        return 0;
    };

    var previewPreloader;

    var onImgLoadEvent = function() {
        // Image is ready.
        var original = this.originalElement;
        original.setCustomData('isReady', 'true');
        original.removeListener('load', onImgLoadEvent);
        original.removeListener('error', onImgLoadErrorEvent);
        original.removeListener('abort', onImgLoadErrorEvent);

        // Hide loader
        CKEDITOR.document.getById(previewLoaderId).setStyle('display', 'none');

        this.firstLoad = false;
    };

    var onImgLoadErrorEvent = function() {
        // Error. Image is not loaded.
        var original = this.originalElement;
        original.removeListener('load', onImgLoadEvent);
        original.removeListener('error', onImgLoadErrorEvent);
        original.removeListener('abort', onImgLoadErrorEvent);

        // Set Error image.
        var noimage = CKEDITOR.getUrl(editor.skinPath + 'images/noimage.png');

        if (this.preview)
            this.preview.setAttribute('src', noimage);

        // Hide loader
        CKEDITOR.document.getById(previewLoaderId).setStyle('display', 'none');
    };

    var numbering = (function(id) {
            var last = 0;
            return function(id) {
                return 'cke_' + (++last) + '_' + id;
            }
        })(),
        previewLoaderId = numbering('insertimage-preview-loader'),
        previewBoxId = numbering('insertimage-preview-box'),
        previewImageId = numbering('insertimage-preview-image'),
        previewTextId = numbering('insertimage-preview-text');

    return {
        title: editor.lang.image.title,
        minWidth: 420,
        minHeight: 310,
        onShow: function() {
            this.imageElement = false;

            // Default: create a new element.
            this.imageEditMode = false;

            this.firstLoad = true;

            var editor = this.getParentEditor(),
                sel = this.getParentEditor().getSelection(),
                element = sel.getSelectedElement();

            //Hide loader.
            CKEDITOR.document.getById(previewLoaderId).setStyle('display', 'none');
            // Create the preview before setup the dialog contents.
            previewPreloader = new CKEDITOR.dom.element('img', editor.document);
            this.preview = CKEDITOR.document.getById(previewImageId);
            this.previewText = CKEDITOR.document.getById(previewTextId);

            // Copy of the image
            this.originalElement = editor.document.createElement('img');
            this.originalElement.setAttribute('alt', '');
            this.originalElement.setCustomData('isReady', 'false');

            if (element && element.getName() == 'img' && !element.getAttribute('_cke_realelement')) {
                this.imageEditMode = element.getName();
                this.imageElement = element;
            }

            if (this.imageEditMode) {
                // Use the original element as a buffer from  since we don't want
                // temporary changes to be committed, e.g. if the dialog is canceled.
                this.cleanImageElement = this.imageElement;
                this.imageElement = this.cleanImageElement.clone(true, true);

                // Fill out all fields.
                this.setupContent(IMAGE, this.imageElement);
            } else {
                this.imageElement =  editor.document.createElement('img');
            }

            // Dont show preview if no URL given.
            if (!CKEDITOR.tools.trim(this.getValueOf('info', 'txtUrl'))) {
                this.preview.removeAttribute('src');
                this.preview.setStyle('display', 'none');
            }
        },
        onOk: function() {
            // Edit existing Image.
            if (this.imageEditMode) {
                var imgTagName = this.imageEditMode;

                // Restore the original element before all commits.
                this.imageElement = this.cleanImageElement;
                delete this.cleanImageElement;

            } else {
                // Create a new image.
                // Image dialog -> create IMG element.
                this.imageElement = editor.document.createElement('img');
                this.imageElement.setAttribute('alt', '');
            }

            // Set attributes.
            this.commitContent(IMAGE, this.imageElement);

            // Remove empty style attribute.
            if (!this.imageElement.getAttribute('style'))
                this.imageElement.removeAttribute('style');

            // Insert a new Image.
            if (!this.imageEditMode) {
                editor.insertElement(this.imageElement);
            } else {
                // Image already exists.
                editor.insertElement(this.imageElement);
            }
        },
        onHide: function() {
            if (this.preview)
                this.commitContent(CLEANUP, this.preview);

            if (this.originalElement) {
                this.originalElement.removeListener('load', onImgLoadEvent);
                this.originalElement.removeListener('error', onImgLoadErrorEvent);
                this.originalElement.removeListener('abort', onImgLoadErrorEvent);
                this.originalElement.remove();
                this.originalElement = false;        // Dialog is closed.
            }

            delete this.imageElement;
        },
        contents: [
            {
                id: 'info',
                label: editor.lang.image.infoTab,
                accessKey: 'I',
                elements: [
                    {
                        id: 'txtUrl',
                        type: 'text',
                        label: editor.lang.common.url,
                        required: true,
                        onChange: function() {
                            var dialog = this.getDialog(),
                                newUrl = this.getValue();

                            //Update original image
                            if (newUrl.length > 0) {
                                //Prevent from load before onShow
                                dialog = this.getDialog();
                                var original = dialog.originalElement;

                                dialog.preview.removeStyle('display');

                                original.setCustomData('isReady', 'false');
                                // Show loader
                                var loader = CKEDITOR.document.getById(previewLoaderId);
                                if (loader)
                                    loader.setStyle('display', '');

                                original.on('load', onImgLoadEvent, dialog);
                                original.on('error', onImgLoadErrorEvent, dialog);
                                original.on('abort', onImgLoadErrorEvent, dialog);
                                original.setAttribute('src', newUrl);

                                // Query the preloader to figure out the url impacted by based href.
                                previewPreloader.setAttribute('src', newUrl);
                                dialog.preview.setAttribute('src', previewPreloader.$.src);
                                updatePreview(dialog);
                            } else if (dialog.preview) {
                                // Dont show preview if no URL given.
                                dialog.preview.removeAttribute('src');
                                dialog.preview.setStyle('display', 'none');
                            }
                        },
                        setup: function(type, element) {
                            if (type == IMAGE) {
                                var url = element.getAttribute('_cke_saved_src') || element.getAttribute('src');
                                var field = this;

                                field.setValue(url);        // And call this.onChange()
                                // Manually set the initial value.(#4191)
                                field.setInitValue();
                                field.focus();
                            }
                        },
                        commit: function(type, element) {
                            if (type == IMAGE && (this.getValue() || this.isChanged())) {
                                element.setAttribute('_cke_saved_src', decodeURI(this.getValue()));
                                element.setAttribute('src', decodeURI(this.getValue()));
                            } else if (type == CLEANUP) {
                                element.setAttribute('src', '');    // If removeAttribute doesn't work.
                                element.removeAttribute('src');
                            }
                        },
                        validate: CKEDITOR.dialog.validate.notEmpty(editor.lang.image.urlMissing)
                    },
                    {
                        type: 'html',
                        html: '<div><div id="' + previewLoaderId + '" class="insertimage-preview-loader" style="display:none"><div class="loading">&nbsp;</div></div>'+
                            '<div id="' + previewBoxId + '" class="insertimage-preview-box">'+
                            '<img id="' + previewImageId + '" alt="" class="insertimage-preview-image" />' +
                            '<p id="' + previewTextId + '" class="insertimage-preview-text">' + editor.lang.insertimage.previewText + '</p>' +
                            '</div></div>'
                    }
                ]
            }
        ]
    };
});

})();
