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
	set_center: function ([cx, cy]) {
		let [_x, _y, w, h] = this.rect
		this.set_pos([cx - w / 2, cy - h / 2])
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

let CanHold = {
	init: function () {
		this.held = null
	},
	num_held: function () {
		return this.held ? 1 + this.held.num_held() : 0
	},
	add_held: function (obj) {
		if (this.held) {
			this.held.add_held(obj)
			return
		}
		this.held = obj
		this.held.set_anchor(this.get_anchor_top())
	},
	drop_held: function () {
		this.held.drop()
		this.held = null
	},
	set_rect: function () {
		if (this.held) this.held.set_anchor(this.get_anchor_top())
	},
	handle_horizontal_collisions: function () {
		if (this.held) this.held.handle_horizontal_collisions()
	},
	get_upward_overlap: function () {
		let objs = world.get_colliders(this.rect), upward_overlap = 0
		if (objs.length) {
			let yinterval = interval_cover_set(objs.map(obj => obj.yinterval))
			upward_overlap = overlap(yinterval, this.yinterval)
		}
		if (this.held) upward_overlap = Math.max(upward_overlap, this.held.get_upward_overlap())
		return upward_overlap
	},
	update: function (dt) {
		if (this.held) this.held.update(dt)
	},
	draw: function () {
		if (this.held) this.held.draw()
	},
	check_fall: function (supporter) {
		if (this.held) this.held.check_fall(this)
	},
}

// Slides horizontally respecting collisions.
let HeldWithOffset = {
	init: function () {
		this.xoffset = 0
		this.recenter_speed = 100
	},
	set_xoffset: function (xoffset) {
		this.xoffset = xoffset
		this.update_position()
	},
	set_anchor: function (anchor) {
		this.anchor = anchor
		this.update_position()
	},
	update_position: function () {
		this.set_anchor_bottom(vec_add(this.anchor, [this.xoffset, 0]))
	},
	update: function (dt) {
		this.set_xoffset(approach(this.xoffset, 0, this.recenter_speed * dt))
	},
	handle_horizontal_collisions: function () {
		let objs = world.get_colliders(this.rect)
		if (!objs.length) return false
		let xinterval = interval_cover_set(objs.map(obj => obj.xinterval))
		let overlap_left = overlap(this.xinterval, xinterval)
		let overlap_right = overlap(xinterval, this.xinterval)
		console.assert(overlap_left > 0 && overlap_right > 0)
		let dx = overlap_left < overlap_right ? -overlap_left : overlap_right
		this.set_xoffset(this.xoffset + dx)
		return true
	},
	handle_vertical_collisions: function () {
	},
	drop: function () {
		if (this.held) this.held.drop()
		this.held = null
	},
	check_fall: function (supporter) {
		if (get_abs_overlap(supporter.xinterval, this.xinterval) < 2) {
			supporter.drop_held()
			return
		}
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



function HeldBlock(original_block) {
	this.original_block = original_block
	this.set_rect(original_block.rect)
	this.image = original_block.image
}
HeldBlock.prototype = UFX.Thing()
	.addcomp(CollisionRect)
	.addcomp({
		drop: function () {
			this.original_block.drop_from(this.rect)
			world.room.add_ore(this.original_block)
		},
	})
	.addcomp(HeldWithOffset)
	.addcomp(CanHold)
	.addcomp(DrawImage)


