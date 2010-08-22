(function() {

CKEDITOR.plugins.add('insertimage', {
    requires: ['dialog'],

    lang: ['en', 'zh-cn'],

    init: function(editor) {
        CKEDITOR.dialog.add('insertimage', this.path + 'dialogs/insertimage.js');

        editor.addCommand('insertimage', new CKEDITOR.dialogCommand('insertimage'));

        editor.ui.addButton('InsertImage', {
            label: editor.lang.common.image,
            className: 'cke_button_image',
            command: 'insertimage'
        });

        editor.on('doubleclick', function(e) {
            var element = e.data.element;

            if (element.is('img') && !element.getAttribute('_cke_realelement')) {
                e.data.dialog = 'insertimage';
            }
        });
    }
});

})();
