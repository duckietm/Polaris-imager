// One layout routine, used by the editor preview, the browser PNG export and the
// server-side /scene render. It is exported twice: as a function for Node, and as
// source text injected into the page, so the three paths cannot drift apart.

export function layoutHabboText(font, text, options) {
    var size = Math.max(4, (options && options.size) || 32);
    var spacing = (options && options.spacing) || 0;
    var lines = String(text == null ? '' : text).split('\n').slice(0, 6);
    var scale = size / font.height;
    var lineHeight = Math.round(font.height * scale * 1.15);
    var out = [];
    var width = 0;
    var y = 0;

    for (var l = 0; l < lines.length; l++) {
        var line = lines[l].toLowerCase();
        var x = 0;
        var placed = [];

        for (var i = 0; i < line.length; i++) {
            var ch = line.charAt(i);

            if (ch === ' ') {
                x += Math.round(font.space * scale) + spacing;
                continue;
            }

            var glyph = font.glyphs[ch];

            if (!glyph) { continue; }

            var w = Math.max(1, Math.round(glyph.w * scale));
            var h = Math.max(1, Math.round(font.height * scale));

            placed.push({ sx: glyph.x, sy: 0, sw: glyph.w, sh: font.height, dx: x, dy: y, dw: w, dh: h });
            x += w + spacing;
        }

        if (x > 0) { x -= spacing; }
        if (x > width) { width = x; }

        out = out.concat(placed);
        y += lineHeight;
    }

    return {
        glyphs: out,
        width: Math.max(1, width),
        height: Math.max(1, lines.length * lineHeight),
        scale: scale
    };
}

export const LAYOUT_JS = layoutHabboText.toString();
