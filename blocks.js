"use strict"

function HeldBlock(original_block, stack_index) {
	this.original_block = original_block
	this.stack_index = stack_index
	this.rect = original_block.rect
	this.xoffset = 0
}
HeldBlock.prototype = {
	to_world_block: function () {
	},
	update_position: function (player_midtop, accumulated_offset) {
		let [px, py] = player_midtop
		let [x, y, w, h] = this.rect
		x = px - w / 2 + accumulated_offset + this.xoffset
		y = py - (this.stack_index + 1) * 24
		this.rect = [x, y, w, h]
	},
	draw: function () {
		let [x, y, w, h] = this.rect
		return ["drawimage", this.original_block.image, x, y]
	},
}



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
	drop_all: function () {
		for (let block of this.held) {
			world.room.add_block(block.to_world_block())
		}
		this.held = []
	},
	update_positions: function (character_midtop) {
		let accumulated_xoffset = 0
		for (let block of this.held) {
			block.update_position(character_midtop, accumulated_xoffset)
			accumulated_xoffset += block.xoffset
		}
	},
	recenter_held: function (dt) {
		let recenter_speed = 100
		for (let block of self.held) {
			block.xoffset = approach(block.xoffset, 0, recenter_speed * dt)
			// TODO: don't recenter if collision occurs.
		}
	},
	handle_horizontal_collisions: function (character_midtop, dt) {
		this.recenter_held(dt)
		for (let block of this.held) {
			let [overlap_left, overlap_right] = interval_overlaps(block.xinterval, obj.xinterval)
			if (overlap_left <= 0 || overlap_right <= 0) return
			let dx = overlap_left < overlap_right ? -overlap_left : overlap_right
			block.xoffset += dx
			this.update_positions(character_midtop)
		}
	},
}

