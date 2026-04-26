"use strict"

// obj.rect is the object's extent for the purpose of collisions.
// All values are in game (G) coordinates.
let CollisionRect = {
	set_rect: function ([x, y, w, h]) {
		this.rect = [x, y, w, h]
		this.xinterval = [x, w]
		this.yinterval = [y, h]
	},
	set_pos_size: function ([x, y], [w, h]) {
		this.set_rect([x, y, w, h])
	},
	// Also sets the size to a 1x1 tile.
	set_tile_pos: function (tile_pos) {
		this.set_pos_size(GconvertT(tile_pos), tile_size)
	},
	get_pos: function () {
		let [x, y, w, h] = this.rect
		return [x, y]
	},
	get_center: function () {
		let [x, y, w, h] = this.rect
		return [x + w / 2, y + h / 2]
	},
	get_centerx: function () {
		let [x, y, w, h] = this.rect
		return x + w / 2
	},
	// Anchors are at the midtop and midbottom of the rect.
	get_anchor_top: function () {
		let [x, y, w, h] = this.rect
		return [x + w / 2, y]
	},
	get_anchor_bottom: function () {
		let [x, y, w, h] = this.rect
		return [x + w / 2, y + h]
	},
	set_pos: function ([x, y]) {
		let [_x, _y, w, h] = this.rect
		this.set_rect([x, y, w, h])
	},
	snap_to_grid: function () {
		let [x, y, w, h] = this.rect
		this.set_rect([GnearestgridG(x), GnearestgridG(y), w, h])
	},
	snap_to_grid_x: function () {
		let [x, y, w, h] = this.rect
		this.set_rect([GnearestgridG(x), y, w, h])
	},
	// Returns true if the target position is reached.
	approach: function ([xtarget, ytarget], dpos) {
		let [x, y] = this.get_pos()
		x = approach(x, xtarget, dpos)
		y = approach(y, ytarget, dpos)
		this.set_pos([x, y])
		return x == xtarget && y == ytarget
	},
	approach_anchor_bottom: function (target, dpos) {
		let [x, y, w, h] = this.rect
		return this.approach(vec_add(target, [-w/2, -h]), dpos)
	},
	scoot: function (dpos) {
		this.set_pos(vec_add(this.get_pos(), dpos))
	},
	set_centerx: function (cx) {
		let [_x, y, w, h] = this.rect
		this.set_pos([cx - w / 2, y])
	},
	set_anchor_bottom: function ([ax, ay]) {
		let [_x, _y, w, h] = this.rect
		this.set_pos([ax - w / 2, ay - h])
	},
}

// Draws this.image at this.get_pos()
let DrawImage = {
	init: function () {
		this.image = null
	},
	draw: function () {
		if (!this.image) return
		UFX.draw("drawimage", this.image, round_pos(this.get_pos()))
	},
}

// Draws this.image centered at this.get_center()
let DrawImageCentered = {
	init: function () {
		this.image = null
	},
	draw: function () {
		if (!this.image) return
		let [x0, y0] = this.get_center(), w = this.image.width, h = this.image.height
		UFX.draw("drawimage", this.image, round_pos([x0 - w / 2, y0 - h / 2]))
	},
}



function HeldBlock(original_block, stack_index) {
	this.original_block = original_block
	this.set_rect(original_block.rect)
	this.stack_index = stack_index
	this.image = original_block.image
}
HeldBlock.prototype = UFX.Thing()
	.addcomp(CollisionRect)
	.addcomp(DrawImage)
	.addcomp({
		init: function () {
			this.xoffset = 0
			this.recenter_speed = 100
		},
		recenter: function (dt) {
			// TODO: don't recenter if collision occurs.
			this.xoffset = approach(this.xoffset, 0, this.recenter_speed * dt)
		},
		update_position: function (anchor) {
			this.set_anchor_bottom(vec_add(anchor, [this.xoffset, 0]))
		},
		handle_horizontal_collisions: function () {
			for (let obj of world.get_colliders(this.rect)) {
				let [overlap_left, overlap_right] = interval_overlaps(this.xinterval, obj.xinterval)
				if (overlap_left <= 0 || overlap_right <= 0) continue
				let dx = overlap_left < overlap_right ? -overlap_left : overlap_right
				this.xoffset += dx
				return true
			}
			return false
		},
		drop: function () {
			console.log("drop")
			this.original_block.drop_from(this.rect)
			world.room.add_ore(this.original_block)
		},
	})



function HeldBlocks() {
	this.reset()
}
HeldBlocks.prototype = {
	reset: function () {
		this.held = []
	},
	create_held: function (block) {
		return new HeldBlock(block, this.held.length)
	},
	add_held: function (block) {
		this.held.push(this.create_held(block))
	},
	drop_from: function (stack_index) {
		this.held.splice(stack_index).forEach(block => block.drop())
	},
	drop_all: function () {
		this.drop_from(0)
	},
	update_positions: function (anchor) {
		for (let block of this.held) {
			block.update_position(anchor)
			anchor = block.get_anchor_top()
		}
	},
	recenter_held: function (dt) {
		this.held.forEach(block => block.recenter(dt))
	},
	handle_horizontal_collisions: function (anchor) {
		for (let block of this.held) {
			if (block.handle_horizontal_collisions()) {
				this.update_positions(anchor)
			}
		}
	},
	check_for_falling_blocks: function (character) {
		let below = character.xinterval
		for (let j = 0 ; j < this.held.length ; ++j) {
			let current = this.held[j].xinterval
			if (get_abs_overlap(below, current) < 2) {
				this.drop_from(j)
				return
			}
			below = current
		}
	},
}

