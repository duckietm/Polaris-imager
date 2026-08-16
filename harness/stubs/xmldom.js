export class DOMParser {
    parseFromString() {
        throw new Error(
            '[pixinode spike] XML parsing is stubbed out. A code path tried to parse XML — ' +
            'install @xmldom/xmldom and remove its alias in vite.node.config.mjs.'
        );
    }
}

export class XMLSerializer {
    serializeToString() {
        return '';
    }
}

export default { DOMParser, XMLSerializer };
