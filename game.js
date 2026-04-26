"use strict"

UFX.scenes.end = {
	start: function () {
		this.t = 0
		this.bg = new Animation(slice_sprite_sheet("end_screen", 384, 288), 0.15, true)
	},
	think: function (dt) {
		this.t += dt
		this.bg.update(dt)
	},
	draw: function () {
		UFX.draw("fs #611 f0 drawimage", this.bg.current_frame)
	},
}



function Character(pos) {
	this.held_blocks = new HeldBlocks()
	this.set_pos_size(pos, [14, 24])
	this.vel = [0, 0]
	this.grounded = false
	this.move_x = 0
	this.jump_down = false
	this.jump_held = false
	this.facing_right = true
	this.is_centering = false
	this.centering_targetx = null
	this.picking_up = false
	this.centering_callback = null

	// Half-widths (u is half of w, get it?)
	this.upickup = 9  // for picking up


	this.max_move_speed = 100
	this.move_accel = 1000
	this.move_decel = 600
	this.jump_speed = 160
	this.gravity = 1100
	this.max_fall_speed = 200
	this.var_jump_time = 0.2
	this.coyote_time = 0.05

	this.jump_speed = 160

	let char_frames = slice_sprite_sheet("character_ss", 24, 24)
	this.images = {
		stand_right: char_frames[0],
		walk_right: new Animation(char_frames.slice(1, 5), 0.15, true),
		stand_left: char_frames[5],
		walk_left: new Animation(char_frames.slice(6, 10), 0.15, true),
		jump_right: char_frames[10],
		jump_left: char_frames[11],
		pickup: char_frames[15],  // TODO: why animation?
	}
}
Character.prototype = UFX.Thing()
	.addcomp(CollisionRect)
	.addcomp(DrawImageCentered)
	.addcomp({
		set_rect: function () {
			this.held_blocks.set_anchor(this.get_anchor_top())
		},
		control: function (key) {
			this.move_x = (key.pressed.right ? 1 : 0) - (key.pressed.left ? 1 : 0)
			this.jump_held = key.pressed.jump
			this.jump_down = key.down.jump
			if (key.down.down) this.attempt_pickup()
		},
		jump: function () {
			let [vx, vy] = this.vel
			this.vel = [vx, -this.jump_speed]
			this.var_jump_timer = this.var_jump_time
			this.grounded = false
		},
		find_pickup_target_block: function () {
			if (!this.grounded) return null
			// TODO: check num blocks held < 3
			for (let obj of world.pickup_targets(this.get_anchor_bottom(), this.upickup)) {
				return obj
			}
			return null
		},
		attempt_pickup: function () {
			if (this.is_centering) return
			let target_block = this.find_pickup_target_block()
			if (!target_block) return
			this.centering_target = target_block.get_anchor_top()
			this.picking_up = true
			this.is_centering = true
			this.centering_callback = this.complete_pickup.bind(this, target_block)
		},
		finish_centering: function () {
			this.is_centering = false
			this.centering_finish_timer = 0.15
			this.centering_locked_position = this.get_pos()
			this.centering_target = null
		},
		complete_pickup: function (block) {
			this.picking_up = false
			this.set_anchor_bottom(block.get_anchor_top())
			world.remove_ore(block)
			this.held_blocks.add_held(block)
		},
		update: function (dt) {
			if (this.centering_finish_timer > 0) {
				this.centering_finish_timer = approach(this.centering_finish_timer, 0, dt)
				if (this.centering_finish_timer == 0) {
					if (this.centering_callback) {
						this.centering_callback()
						this.centering_callback = null
					}
					this.centering_locked_position = null
				}
			}
			if (this.is_centering) {
				this.update_centering(dt)
			} else if (!this.centering_locked_position) {
				this.update_movement(dt)
				this.update_position(dt)
			} else {
				this.set_pos(this.centering_locked_position)
			}

			if (this.move_x > 0) this.facing_right = true
			if (this.move_x < 0) this.facing_right = false
			
			this.image = this.get_image(dt)
			this.var_jump_timer = approach(this.var_jump_timer, 0, dt)
		},
		get_image: function (dt) {
			if (this.picking_up) return this.images.pickup
			let dir = this.facing_right ? "right" : "left"
			if (!this.grounded) return this.images[`jump_${dir}`]
			if (this.move_x == 0) return this.images[`stand_${dir}`]
			let anim = this.images[`walk_${dir}`]
			anim.update(dt)
			return anim.current_frame
		},
		update_movement: function (dt) {
			let [vx, vy] = this.vel
			let accel = this.move_x ? this.move_accel : this.move_decel
			vx = approach(vx, this.move_x * this.max_move_speed, accel * dt)
			this.coyote_timer = this.grounded ? this.coyote_time : approach(this.coyote_timer, 0, dt)
			if (!this.grounded) {
				if (this.var_jump_timer > 0) {
					if (this.jump_held && vy < 0) {
						vy += this.gravity * 0.5 * dt
					} else {
						this.var_jump_timer = 0
						if (vy < 0) vy *= 0.5  // TODO: make independent of dt
					}
				} else {
					vy += this.gravity * dt
				}
			}
			this.vel = [vx, vy]
			console.log("update_movement", accel, this.vel)
			if (this.jump_down && this.coyote_timer > 0) this.jump()
		},
		update_position: function (dt) {
			let [vx, vy] = this.vel
			this.scoot([vx * dt, 0])
			this.handle_horizontal_collision()
			this.held_blocks.recenter_held(dt)
			this.held_blocks.handle_horizontal_collisions(this.get_anchor_top())
			this.held_blocks.check_for_falling_blocks(this)
			this.scoot([0, vy * dt])
			this.handle_vertical_collision()
			this.handle_vertical_block_collision()
			;[vx, vy] = this.vel
			if (vy > 0) {
				this.grounded = false
			} else if (this.grounded && vy == 0) {
				this.grounded = world.is_on_ground(this.rect)
			}
		},
		update_centering: function (dt) {
			if (!this.centering_target) {
				console.log("!this.centering_target")
				this.finish_centering()
				return
			}
			let centering_speed = 150
			if (this.approach_anchor_bottom(this.centering_target, centering_speed * dt)) {
				this.finish_centering()
			}
		},
		handle_horizontal_collision: function () {
			// The max jump height is 23.78 but you want to be able to jump up to a block 24 high.
			// In pygame I believe this is subtly handled via pygame.Rect coordinate truncation.
			// Here we do it by excluding 1 pixel from the bottom of the character's rect for the
			// purpose of horizontal collision only.
			let [x, y, w, h] = this.rect, hrect = [x, y, w, h - 1]
			let objs = world.get_colliders(hrect)
			if (!objs.length) return
			let xinterval = interval_cover_set(objs.map(obj => obj.xinterval))
			let overlap_left = overlap(this.xinterval, xinterval)
			let overlap_right = overlap(xinterval, this.xinterval)
			console.assert(overlap_left > 0 && overlap_right > 0)
			console.log("handle_horizontal_collision", this.rect, objs, overlap_left, overlap_right, this.vel)
			let [vx, vy] = this.vel
			let dx =
				vx > 0 ? -overlap_left :
				vx < 0 ? overlap_right :
				// When vx == 0, push in direction of least displacement.
				overlap_left < overlap_right ? -overlap_left : overlap_right
			this.scoot([dx, 0])
			this.vel = [0, vy]
		},
		handle_vertical_collision: function () {
			let overlap_up = 0
			let overlap_down = 0 // this.held_blocks.get_vertical_overlap_down()
			let objs = world.get_colliders(this.rect)
			if (objs.length) {
				let yinterval = interval_cover_set(objs.map(obj => obj.yinterval))
				overlap_up = overlap(this.yinterval, yinterval)
				overlap_down = Math.max(overlap_down, overlap(yinterval, this.yinterval))
			}
			console.log("handle_vertical_collision", overlap_up, overlap_down)
			if (overlap_up == 0 && overlap_down == 0) return
			let [vx, vy] = this.vel
			if (overlap_up < overlap_down && vy >= 0) {
				console.log("scoot up", -overlap_up)
				this.scoot([0, -overlap_up])
				this.grounded = true
			}
			if (overlap_down < overlap_up && vy <= 0) {
				console.log("scoot down", overlap_down)
				this.scoot([0, overlap_down])
				this.var_jump_timer = 0
			}
			this.vel = [vx, 0]
		},
		handle_vertical_block_collision: function () {
			let overlap_down = this.held_blocks.get_vertical_overlap_down()
			if (overlap_down == 0) return
			let [vx, vy] = this.vel
			console.log("block scoot down", overlap_down)
			this.scoot([0, overlap_down])
			this.var_jump_timer = 0
			this.vel = [vx, 0]
		},
		
		draw: function () {
			this.held_blocks.held.forEach(block => block.draw())
		},
	})


