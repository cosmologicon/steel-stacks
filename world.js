
let tile_imgs = null
function tile_img(gid) {
	if (!tile_imgs) tile_imgs = slice_sprite_sheet("tiles_ss", 24, 24)
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

function Room(room_id) {
	this.data = room_data[room_id]
	this.load()
}
Room.prototype = {
	load: function () {
		this.images = []
		for (let y = 0 , j = 0 ; y < 12 ; ++y) {
			for (let x = 0 ; x < 16 ; ++x , ++j) {
				let gid = this.data.tiles[j]
				if (gid == 0) continue
				gid -= 1
				this.images.push(["drawimage", tile_img(gid), 24 * x, 24 * y])
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

