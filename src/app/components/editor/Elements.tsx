import { Quill } from "react-quill";
import { cssColorMXID } from "../../../util/colorMXID";

const Embed: any = Quill.import('blots/embed');
const Inline: any = Quill.import('blots/inline');

class MentionBlot extends Embed {
    static blotName = 'mention';
    static tagName = 'span';
    static className = 'iql-mention';

    static create(value: any) {
        let node = super.create();
        node.setAttribute('data-id', value.id);
        node.setAttribute('data-name', value.name);
        node.setAttribute('data-type', value.type);
        node.setAttribute('contenteditable', false);
        node.textContent = (value.type == 'user' ? '@' : '#') + value.name;
        console.warn('TODO allow setting custom shields instance');
        // блин какой же это костыль
        // зато на мобиле работает
        // make a code worser than yandere simulator's code challenge
        // node.setAttribute('src', `https://shields.officialdakari.ru/badge/${encodeURIComponent(
        //     (value.type == 'user' ? '@' : '#') + value.name
        //         .replaceAll('_', '__')
        //         .replaceAll('-', '--')
        // )}-8A2BE2`);
        return node;
    }

    static formats(node: any) {
        return `${node.dataset.type == 'user' ? '@' : '#'}${node.dataset.name}`;
    }

    static value(node: any) {
        return {
            id: node.getAttribute('data-id'),
            name: node.getAttribute('data-name'),
            type: node.getAttribute('data-type')
        };
    }
}

Quill.register(MentionBlot);

class InlineImage extends Inline {
    static create(value: any) {
        console.log(value);
        let node = super.create(value);
        node.setAttribute('data-shortcode', value.shortcode || '');
        node.setAttribute('data-mxc', value.mxc || '');
        node.setAttribute('contenteditable', 'true');
        node.style.display = 'inline';
        node.style.height = '16px';
        node.style.maxHeight = '16px';
        node.innerHTML = `<img src="${value.src}" style="height: 16px; vertical-align: middle"></img>`;
        console.log(node);
        return node;
    }

    static formats(node: any) {
        return {
            src: node.getAttribute('src'),
            shortcode: node.getAttribute('data-shortcode'),
            mxc: node.getAttribute('data-mxc')
        };
    }

    static value(node: any) {
        return {
            src: node.getAttribute('src'),
            shortcode: node.getAttribute('data-shortcode'),
            mxc: node.getAttribute('data-mxc')
        };
    }
}

InlineImage.blotName = 'inlineimage';
InlineImage.tagName = 'span';

Quill.register(InlineImage);

const ImageFormat: any = Quill.import('formats/image');
ImageFormat.sanitize = (url: any) => url;

Quill.register(ImageFormat, true);

const Clipboard: any = Quill.import('modules/clipboard');

class CustomClipboard extends Clipboard {
    onCapturePaste(e: any) {
        e.preventDefault();
        // Здесь обрабатываем вставку как вам нужно. Например, убираем теги HTML
        const text = (e.originalEvent || e).clipboardData.getData('text/plain');
        console.log(text);
        this.quill.insertText(this.quill.getSelection(), text);
    }
    onPaste(e: any) {
        e.preventDefault();
        // Здесь обрабатываем вставку как вам нужно. Например, убираем теги HTML
        const text = (e.originalEvent || e).clipboardData.getData('text/plain');
        console.log(text);
        this.quill.insertText(this.quill.getSelection(), text);
    }
}

Quill.register('modules/clipboard', CustomClipboard, true);