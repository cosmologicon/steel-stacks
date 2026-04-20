
let tile_imgs = null
function tile_img(gid) {
	tile_imgs ||= slice_sprite_sheet("tiles_ss", 24, 24)
	return tile_imgs[gid]
}

function Checkpoint(tile_pos) {
	this.tile_pos = tile_pos
	this.pos = tile_to_xy(tile_pos)
	this.active = false
}
Checkpoint.prototype = {
	activate: function () {
		this.active = true
	},
	draw: function () {
		let img = tile_img(2)
		// TODO: don't redraw every frame.
		if (this.active) img = glow_image(img)
		return ["drawimage", img, this.pos]
	},
}


function Receiver(tile_pos) {
	this.tile_pos = tile_pos
	this.pos = tile_to_xy(tile_pos)
	this.active = false
}
Receiver.prototype = {
	activate: function () {
		this.active = true
	},
	draw: function () {
		let img = tile_img(144)
		// TODO: don't redraw every frame.
		if (this.active) img = lighten_image(img)
		return ["drawimage", img, this.pos]
	},
}

function Door(tile_pos) {
	this.tile_pos = tile_pos
	this.pos = tile_to_xy(tile_pos)
	this.open = false
	let frames = slice_sprite_sheet("door_ss", 24, 48)
	this.open_anim = new Animation(frames, 0.1)
	this.close_anim = new Animation(frames.toReversed(), 0.1)
	this.image = frames[0]
}
Door.prototype = {
	draw: function () {
		return ["drawimage", this.image, this.pos]
	},

}

function SolidBlock(tile_pos) {
	this.tile_pos = tile_pos
	this.pos = tile_to_xy(tile_pos)
	let [x, y] = this.pos, [w, h] = [24, 24]
	this.rect = [x, y, w, h]
	this.xinterval = [x, w]
	this.yinterval = [y, h]
}


function Room(room_id) {
	this.data = room_data[room_id]
	this.load()
}
Room.prototype = {
	load: function () {
		this.images = []
		this.blocks = []
		for (let y = 0 , j = 0 ; y < 12 ; ++y) {
			for (let x = 0 ; x < 16 ; ++x , ++j) {
				let gid = this.data.tiles[j]
				if (gid == 0) continue
				gid -= 1
				this.images.push(["drawimage", tile_img(gid), 24 * x, 24 * y])
				this.blocks.push(new SolidBlock([x, y]))
			}
		}
		this.checkpoint = this.data.checkpoint ? new Checkpoint(this.data.checkpoint) : null
		this.receivers = (this.data.receivers || []).map(pos => new Receiver(pos))
		this.doors = (this.data.doors || []).map(pos => new Door(pos))
		this.objs = (this.checkpoint ? [this.checkpoint] : []).concat(this.receivers, this.doors)
	},
	draw: function () {
		UFX.draw(this.images)
		UFX.draw(this.objs.map(obj => obj.draw()))
	},
}




let parse_level_grid = (grid_spec) => {
	return grid_spec.split("\n").filter(line => line.trim().length).map(line => line.match(/\S+/g))
}
let LEVEL_GRID = parse_level_grid(`
  .     .   sk_13 sk_15   .     .     .     .     .     .
  .     .   sk_12 sk_14   .     .     .     .     .     .
  .     .   sk_11   .     .     .     .     .     .     .
  .   sk_10 sk_1  sk_2  sk_3  sk_4  sk_5  sk_6    .     .
  .     .     .     .     .     .   sk_8  sk_7    .     .
  .     .     .     .     .     .   sk_9    .     .     .
pw_5  pw_4  pw_3  pw_2  pw_1  hb_5  hb_1  hb_2    .     .
pw_6    .     .     .   gl_1  hb_6    .   hb_3    .     .
  .     .     .     .   gl_2    .     .   hb_4    .     .
  .     .     .     .   gl_3    .     .   ug_1  ug_2  ug_3
  .     .     .     .   gl_4  gl_5    .   ug_6  ug_5  ug_4
`)

let world = {
	init: function () {
		this.room_coord = [2, 0]
		this.rooms = {}
		this.load_room()
		this.character = new Character([100, 20])
	},
	load_room: function () {
		let [room_x, room_y] = this.room_coord
		let room_id = LEVEL_GRID[room_y][room_x]
		this.rooms[room_id] ||= new Room(room_id)
		this.room = this.rooms[room_id]
	},
	transition: function (dcoord) {
		let [dx, dy] = dcoord
		this.room_coord = vec_add(this.room_coord, dcoord)
		this.load_room()
		this.character.scoot([-384 * dx, -288 * dy])
	},
	// All objects that collide with the given rect
	get_colliders: function (rect) {
		return this.room.blocks.filter(block => rect_collide(block.rect, rect))
	},
	is_on_ground: function (rect) {
		let [x, y, w, h] = rect, ybase = y + h
		let ps = [[x, ybase], [x + w - 1, ybase]]
		// TODO: more efficient
		return ps.some(([x, y]) => this.get_colliders([x, y, 1, 1]).length)
	},
}

