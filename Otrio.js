const MAX_PLAYERS = 4;
var line_width, circle_gap, spacing, draw_offset, colors = ["#9fff37", "#fe122e", "#3d03b5", "#9f009f"], corpse_colors = ["#6cd10066", "#a7011466", "#1b005266", "#38003866"], empty_color = "#44220033", background_color = "#FED06B", corpse_alpha = "66", corpse_alpha_val = 0x66, empty_alpha = "33", empty_alpha_val = 0x33, width = 3;
var canvas, ctx, input_players, input_size, check_box, input_width, lastMouseE;
var players, game, num_players = 0, currentPlayer = 0, gameOver, saveCorpses = true, deadMen = [];
document.addEventListener("DOMContentLoaded", () => {
    let coll = document.getElementsByClassName("collapsible");
    for (let i = 0; i < coll.length; i++)
        coll[i].addEventListener("click", (e) => {
            coll[i].classList.toggle("active");
            var content = coll[i].nextElementSibling;
            content.style.maxHeight = content.style.maxHeight ? null : "fit-content";
        });
    var colors_base = document.getElementById("colors");
    document.getElementById("bkgrd_color").value = background_color.substring(0, 7);
    document.getElementById("empty_color").value = empty_color.substring(0, 7);
    function create_color(idx) {
        var n = document.createElement("div");
        var id = document.createElement("label");
        function set_color_props(sub_catagory) {
            var elem = document.createElement("input");
            let is_corpse = sub_catagory == "corpse";
            elem.id = sub_catagory + "_color_" + idx;
            elem.type = "color";
            var color_arr = is_corpse ? corpse_colors : colors;
            elem.value = color_arr[idx].substring(0, 7) + (is_corpse ? corpse_alpha : "");
            elem.style.width = "35%";
            elem.addEventListener("focus", () => elem.setAttribute("old_color", elem.value));
            elem.addEventListener("change", () => exchange_colors(elem, idx, is_corpse));
            return elem;
        }
        var base = set_color_props("base");
        var corpse = set_color_props("corpse");
        id.innerText = "Player " + (idx + 1) + " ";
        id.setAttribute("for", base.id);
        n.appendChild(id);
        n.appendChild(base);
        n.appendChild(corpse);
        return n;
    }
    for (let i = 0; i < colors.length; i++)
        colors_base.appendChild(create_color(i));
    let e_alp_elem = document.getElementById("blank-alpha");
    let c_alp_elem = document.getElementById("corpse-alpha");
    e_alp_elem.value = "" + empty_alpha_val;
    c_alp_elem.value = "" + corpse_alpha_val;
    e_alp_elem.addEventListener("change", () => {
        empty_alpha = (+e_alp_elem.value).toString(16);
        empty_alpha = empty_alpha.length > 1 ? empty_alpha : "0" + empty_alpha;
        exchange_colors(document.getElementById("empty_color"), null, 0);
    });
    c_alp_elem.addEventListener("change", () => {
        corpse_alpha = (+c_alp_elem.value).toString(16);
        corpse_alpha = corpse_alpha.length > 1 ? corpse_alpha : "0" + corpse_alpha;
        for (let i = 0; i < MAX_PLAYERS; i++) {
            let old_c = corpse_colors[i];
            c_swap(i, old_c, old_c.substring(0, 7) + corpse_alpha, 1);
        }
    });
});
function exchange_colors(elem, idx, is_corpse) {
    var new_c = elem.value;
    var old_c = elem.getAttribute("old_color");
    if (new_c != old_c && (colors.includes(new_c) || corpse_colors.includes(new_c + corpse_alpha))) {
        elem.value = old_c;
        return;
    }
    if (idx == null) {
        empty_color = new_c + empty_alpha;
        return;
    }
    if (is_corpse) {
        old_c += corpse_alpha;
        new_c += corpse_alpha;
    }
    c_swap(idx, old_c, new_c, is_corpse);
}
class Player {
    constructor(id) {
        this.id = id;
        this.postion = id * spacing;
        this.color = colors[id];
        let dx = new Array(width).fill(-1.05);
        let dy = new Array(width).fill(-1.05);
        switch (id) {
            case 0:
                dy = new Array(width).fill(width + 0.1);
            case 1:
                dx = Array.from({ length: width }, (_, i) => i);
                break;
            case 3:
                dx = new Array(width).fill(width + 0.1);
            case 2:
                dy = Array.from({ length: width }, (_, i) => i);
                break;
        }
        this.pieces = [];
        for (let i = 0; i < width; i++)
            this.pieces.push(new otrio(dx[i], dy[i], this.color));
    }
    draw() {
        this.pieces.forEach((t) => t.draw());
    }
    makeMove(circle_info) {
        var played_pos = game[circle_info.r][circle_info.c];
        if (played_pos.circles[circle_info.n] == null && this.markPiece(circle_info.n)) {
            played_pos.circles[circle_info.n] = colors[currentPlayer];
            checkWin(circle_info);
        }
    }
    markPiece(n) {
        for (let i = 0; i < this.pieces.length; i++)
            if (this.pieces[i].circles[n]) {
                this.pieces[i].circles[n] = null;
                return true;
            }
        return false;
    }
}
class otrio {
    constructor(x, y, c = null) {
        this.x = x;
        this.y = y;
        this.circles = new Array(width).fill(c);
        this.recalcPaths();
    }
    recalcPaths() {
        this.paths = [];
        for (let i = 0; i < this.circles.length; i++)
            this.paths.push(this._draw_circle(line_width + i * circle_gap, this.circles[i]));
        var selectR = line_width + (width - 1) * circle_gap + line_width;
        var p = new Path2D();
        p.arc(draw_offset + this.x * spacing, draw_offset + this.y * spacing, selectR, 0, 2 * Math.PI);
        this.inRange = p;
    }
    draw() {
        for (let i = 0; i < this.circles.length; i++)
            this._draw_circle(line_width + i * circle_gap, this.circles[i]);
    }
    _draw_circle(r, c) {
        ctx.strokeStyle = c ? c : empty_color;
        ctx.lineWidth = line_width;
        const x = draw_offset + this.x * spacing;
        const y = draw_offset + this.y * spacing;
        var p = new Path2D();
        p.arc(x, y, r, 0, 2 * Math.PI);
        p.closePath();
        ctx.stroke(p);
        return p;
    }
    get_match(c) {
        var matches = 0;
        for (let i = 0; i < this.circles.length; i++)
            matches |= +(this.circles[i] == c) << i;
        return matches;
    }
    getCircle(e) {
        for (let i = 0; i < this.circles.length; i++)
            if (ctx.isPointInStroke(this.paths[i], e.offsetX, e.offsetY))
                return i;
        return null;
    }
}
class circle_info {
    constructor(r, c, n) {
        this.r = r;
        this.c = c;
        this.n = n;
        this.color = null;
    }
}
function c_swap(idx, old_c, new_c, is_corpse) {
    players[idx].pieces.forEach((p) => p.circles.forEach((c, i) => {
        if (c === old_c)
            p.circles[i] = new_c;
    }));
    game.forEach((r) => r.forEach((p) => p.circles.forEach((c, i) => {
        if (c === old_c)
            p.circles[i] = new_c;
    })));
    (is_corpse ? corpse_colors : colors)[idx] = new_c;
}
function OnLoad() {
    getSettings();
    gameOver = false;
    currentPlayer = currentPlayer % num_players;
    players = [];
    for (let i = 0; i < MAX_PLAYERS; i++)
        players.push(new Player(i));
    for (let i = num_players; i < MAX_PLAYERS; i++) {
        players[i].pieces.forEach((t) => {
            for (let j = 0; j < t.circles.length; j++)
                t.circles[j] = corpse_colors[i];
        });
    }
    game = [];
    for (let i = 0; i < width; i++) {
        game[i] = [];
        for (let j = 0; j < width; j++)
            game[i].push(new otrio(i, j));
    }
    if (saveCorpses)
        deadMen.forEach((c_i) => (game[c_i.r][c_i.c].circles[c_i.n] = corpse_colors[c_i.color]));
    draw();
}
function draw() {
    if (gameOver)
        return;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = line_width / 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    draw_game_board();
    if (lastMouseE)
        highlightSelected(lastMouseE);
    requestAnimationFrame(draw);
}
function draw_game_board() {
    ctx.fillStyle = ctx.strokeStyle = background_color;
    ctx.beginPath();
    const game_board_width = (spacing + line_width / 3) * (width + 2);
    const game_board_height = spacing * (width + 0.1);
    ctx.roundRect(line_width / 2, spacing + line_width / 2, game_board_width, game_board_height, circle_gap);
    ctx.roundRect(spacing + line_width / 2, line_width / 2, game_board_height, game_board_width, circle_gap);
    ctx.fill();
    ctx.closePath();
    ctx.fillStyle = background_color;
    ctx.fillStyle = background_color;
    {
        var close_dist = spacing + line_width / 2, mid_dist = spacing / 2, far_dist = spacing * (width + 1) + line_width * 1.36;
        ctx.beginPath();
        ctx.moveTo(close_dist, mid_dist);
        ctx.arcTo(close_dist, close_dist, mid_dist, close_dist, 90);
        ctx.lineTo(close_dist, close_dist);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(far_dist, mid_dist);
        ctx.arcTo(far_dist, close_dist, far_dist + mid_dist, close_dist, 90);
        ctx.lineTo(far_dist, close_dist);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(close_dist, far_dist + mid_dist);
        ctx.arcTo(close_dist, far_dist, mid_dist, far_dist, 90);
        ctx.lineTo(close_dist, far_dist);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(far_dist, far_dist + mid_dist);
        ctx.arcTo(far_dist, far_dist, far_dist + mid_dist, far_dist, 90);
        ctx.lineTo(far_dist, far_dist);
        ctx.closePath();
        ctx.fill();
    }
    ctx.strokeStyle = empty_color;
    ctx.beginPath();
    ctx.roundRect(spacing + line_width, spacing + line_width, game_board_height, game_board_height, circle_gap);
    ctx.stroke();
    ctx.closePath();
    players.forEach((p) => p.draw());
    game.forEach((r) => r.forEach((c) => c.draw()));
}
function highlightSelected(e) {
    var circle_info = getSelectedCircle(e);
    if (circle_info && circle_info.n != null) {
        ctx.strokeStyle = colors[currentPlayer] + empty_alpha;
        ctx.stroke(game[circle_info.r][circle_info.c].paths[circle_info.n]);
    }
}
function mouseClick(e) {
    if (gameOver) {
        OnLoad();
        return;
    }
    var circle_info = getSelectedCircle(e);
    if (circle_info)
        players[currentPlayer].makeMove(circle_info);
}
function getSelectedCircle(e) {
    for (let r = 0; r < game.length; r++)
        for (let c = 0; c < game.length; c++)
            if (ctx.isPointInPath(game[r][c].inRange, e.offsetX, e.offsetY))
                return new circle_info(r, c, game[r][c].getCircle(e));
    return null;
}
function checkWin(circle_info) {
    var playerColor = colors[currentPlayer];
    circle_info.color = currentPlayer;
    var r = circle_info.r;
    var c = circle_info.c;
    var ascending_arr = Array.from({ length: width }, (_, i) => i);
    var hasMatch = game[r][c].get_match(playerColor) == (1 << width) - 1;
    hasMatch || (hasMatch = check_consecutive(new Array(width).fill(r), ascending_arr, playerColor) ||
        check_consecutive(ascending_arr, new Array(width).fill(c), playerColor));
    hasMatch || (hasMatch = check_consecutive(ascending_arr, ascending_arr, playerColor) ||
        check_consecutive(ascending_arr, [...ascending_arr].reverse(), playerColor));
    if (hasMatch) {
        deadMen.push(circle_info);
        win_game();
    }
    else if (is_cats())
        cats_game();
    else
        currentPlayer = (currentPlayer + 1) % num_players;
}
function check_consecutive(rows, cols, playerColor) {
    const matches = rows.map((row, i) => game[row][cols[i]].get_match(playerColor));
    if (matches.reduce((p, c) => p & c, (1 << width) - 1) != 0)
        return true;
    if (matches.reduce((p, c, i) => p | (c & (1 << i)), 0) == (1 << width) - 1)
        return true;
    return matches.reduce((p, c, i) => p | (c & (1 << (width - 1 - i))), 0) == (1 << width) - 1;
}
function win_game() {
    lastMouseE = null;
    draw();
    gameOver = true;
    var txt = "Player " + (currentPlayer + 1) + " Wins!!";
    console.log("Congrats!!! " + txt);
    ctx.fillStyle = colors[currentPlayer];
    ctx.strokeStyle = "#000";
    ctx.lineWidth = line_width / 2;
    ctx.font = spacing / 2 + "px Arial";
    ctx.textAlign = "center";
    ctx.lineJoin = "round";
    ctx.strokeText("Congrats!!!", spacing * (width - 0.5), spacing * (width - 0.25));
    ctx.fillText("Congrats!!!", spacing * (width - 0.5), spacing * (width - 0.25));
    ctx.strokeText(txt, spacing * (width - 0.5), spacing * (width + 0.25));
    ctx.fillText(txt, spacing * (width - 0.5), spacing * (width + 0.25));
}
function getSettings() {
    input_players = input_players ? input_players : document.getElementById("player-count");
    input_size = input_size ? input_size : document.getElementById("game-width");
    check_box = check_box ? check_box : document.getElementById("checkbox-corpse");
    input_width = input_width ? input_width : document.getElementById("game-size");
    if (!canvas) {
        canvas = document.getElementById("canvas");
        canvas.addEventListener("click", mouseClick);
        canvas.addEventListener("mousemove", (e) => (lastMouseE = e));
    }
    ctx = ctx ? ctx : canvas.getContext("2d");
    num_players = +input_players.value;
    line_width = +input_size.value;
    saveCorpses = check_box.checked;
    width = +input_width.value;
    circle_gap = line_width * 1.25;
    spacing = (circle_gap + line_width) * (width + 1);
    draw_offset = 1.6 * spacing;
    canvas.width = spacing * (width + 2) + spacing / 4;
    canvas.height = spacing * (width + 2) + spacing / 4;
    if (game)
        for (let i = 0; i < game.length; i++)
            for (let j = 0; j < game.length; j++)
                game[i][j].recalcPaths();
}
function is_cats() {
    var player_matches = true;
    for (let i = 0; i < num_players; i++)
        player_matches && (player_matches = players[i].pieces.every((c) => c.get_match(null) == (1 << width) - 1));
    if (player_matches)
        return true;
    return game.every((r) => r.every((c) => c.get_match(null) == 0));
}
function cats_game() {
    lastMouseE = null;
    draw();
    gameOver = true;
    var txt = "Nobody wins...";
    console.log("Cats Game " + txt);
    ctx.fillStyle = background_color;
    ctx.strokeStyle = "#000";
    ctx.lineWidth = line_width / 2;
    ctx.font = spacing / 2 + "px Arial";
    ctx.textAlign = "center";
    ctx.lineJoin = "round";
    ctx.strokeText("Cats Game", spacing * (width - 0.5), spacing * (width - 0.25));
    ctx.fillText("Cats Game", spacing * (width - 0.5), spacing * (width - 0.25));
    ctx.strokeText(txt, spacing * (width - 0.5), spacing * (width + 0.25));
    ctx.fillText(txt, spacing * (width - 0.5), spacing * (width + 0.25));
    deadMen = [];
}
//# sourceMappingURL=Otrio.js.map