
let room_data = {
	sk_1: {
		tiles: [
			35,0,65,0,0,0,0,0,0,0,0,0,40,0,0,65,
			35,0,82,0,0,0,0,0,0,0,0,0,0,0,17,88,
			35,0,0,0,0,0,0,0,0,0,0,0,0,17,54,35,
			35,0,0,0,0,0,0,0,0,0,0,0,67,86,50,51,
			36,81,83,0,0,0,0,0,0,0,0,0,0,0,0,0,
			148,149,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
			148,0,0,0,0,0,0,0,17,18,180,181,0,0,0,0,
			35,0,0,0,0,0,0,17,54,34,34,52,19,0,0,0,
			35,0,0,0,0,0,17,54,34,34,34,34,52,19,0,0,
			52,18,18,18,18,18,54,34,34,34,34,34,34,52,18,18,
			34,34,34,34,34,34,34,34,34,34,34,34,34,34,34,34,
			34,34,34,34,34,34,34,34,34,34,34,34,34,34,34,34
		],
	},
	gl_3: {
		tiles: [
			34,20,50,50,50,50,50,50,50,50,50,50,51,0,0,33,
			20,51,0,0,0,0,0,0,0,0,0,0,0,0,0,33,
			35,0,0,0,0,0,0,0,0,0,0,0,0,0,0,33,
			35,0,0,0,0,0,0,0,0,0,0,0,0,0,0,33,
			35,0,0,17,69,81,81,83,0,0,0,0,0,0,0,33,
			35,0,0,33,35,0,0,0,0,0,0,0,0,0,0,33,
			35,0,0,33,35,0,6,1,0,0,0,0,0,0,0,33,
			35,0,0,33,52,18,18,19,0,0,0,0,0,0,5,33,
			35,0,0,33,34,34,34,35,0,0,0,5,5,0,1,33,
			35,0,0,33,34,34,34,35,0,0,66,5,5,17,18,54,
			35,0,0,33,34,34,34,52,18,18,53,18,18,54,34,34,
			35,0,0,33,34,34,34,34,34,34,34,34,34,34,34,34
		],
		// TODO: why does this correspond with (312, 216) = (16x13, 16x9)?
		checkpoint: [12, 8],
	},
	pw_2: {
		tiles: [
			34,34,34,34,34,34,34,34,34,34,34,34,34,34,34,34,
			34,34,34,34,34,34,34,34,34,34,34,34,34,34,34,34,
			34,20,50,50,50,50,50,50,50,50,50,50,50,50,22,34,
			34,35,0,0,0,0,0,0,0,0,0,0,0,0,33,34,
			147,35,0,0,0,0,0,0,0,0,0,0,0,0,33,34,
			34,35,0,0,0,0,0,0,0,0,0,0,0,0,33,34,
			50,51,0,0,0,0,4,0,4,0,0,0,0,67,86,50,
			0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,
			0,0,0,0,0,0,0,0,0,0,66,1,0,0,0,0,
			18,92,18,18,18,18,18,18,18,18,53,18,18,18,18,18,
			34,34,34,34,34,34,34,34,34,34,34,34,34,34,34,34,
			34,34,34,34,34,34,34,34,34,34,34,34,34,34,34,34
		],
		checkpoint: [14, 8],
		receivers: [[8, 7], [6, 7]],
		doors: [[1, 8]],
	},

}

/*
  <data encoding="csv">
</data>
 </layer>
 <objectgroup id="4" name="Receivers">
  <object id="5" gid="145" x="192" y="192" width="24" height="24"/>
  <object id="6" gid="145" x="144" y="192" width="24" height="24"/>
 </objectgroup>
 <objectgroup id="3" name="Doors">
  <object id="4" gid="162" x="24" y="216" width="24" height="24"/>
 </objectgroup>
 <objectgroup id="2" name="Checkpoint">
  <object id="3" gid="3" x="336" y="216" width="24" height="24"/>
 </objectgroup>
</map>

*/

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
		console.log(img, this.pos)
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

/*
class Door(pygame.sprite.Sprite):

    def __init__(self, x, y, tile_image, world_mgr=None):
        super().__init__()
        self.obj_type = "door"
        self.x = x
        self.y = y
        self.world_mgr = world_mgr
        self.image_ss = pygame.image.load(data.filepath("door_ss.png"))
        self.images = util.slice_sprite_sheet(self.image_ss, 24, 48)
        self.image_closed = self.images[0][0]
        self.image_opening = util.Animation(
            self.images[0][1:], 0.1, loop=False, callback_fn=self._on_opening_complete
        )
        self.image_closing = util.Animation(
            self.images[0][::-1], 0.1, loop=False, callback_fn=self._on_closing_complete
        )
        self.image = self.image_closed
        self.rect = self.image.get_rect()
        self.rect.topleft = (x, y - const.TILE_SIZE)
        self.opened = False
        self.has_collision = True

    def open(self):
        if not self.opened:
            self.opened = True
            self.image_opening.reset()
            self.image = self.image_opening

    def close(self):
        if self.opened:
            self.opened = False
            self.image_closing.reset()
            self.image = self.image_closing

    def toggle(self):
        if self.opened:
            self.close()
        else:
            self.open()

    def _on_opening_complete(self):
        self.has_collision = False
        self.image = self.images[0][-1]  # Final open frame.

    def _on_closing_complete(self):
        self.has_collision = True
        self.image = self.image_closed  # Closed frame.

    def update(self, dt):
        if isinstance(self.image, util.Animation):
            self.image.update(dt)
*/

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

