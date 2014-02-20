function trinket1game() {
    
    var game = new Phaser.Game(400, 300, Phaser.AUTO, '', {preload: preload, create: create, update: update});

    function preload() {
        game.load.spritesheet('chassis', 'assets/sprites/tank_chassis.png', 60, 60, 3);
        game.load.spritesheet('gun', 'assets/sprites/tank_gun.png', 60, 60);
    }

    function create() {
        tank_chassis = game.add.sprite(100, 100, 'chassis');
        tank_gun = game.add.sprite(100, 100, 'gun');
        gun_frame = 2;
        tank_gun.frame = gun_frame;
        
        tank_chassis.animations.add('rollfw');
        tank_chassis.animations.add('rollbk', [0, 2, 1]);
        
        leftKey = game.input.keyboard.addKey(Phaser.Keyboard.LEFT);
        rightKey = game.input.keyboard.addKey(Phaser.Keyboard.RIGHT);
        upKey = game.input.keyboard.addKey(Phaser.Keyboard.UP);
        downKey = game.input.keyboard.addKey(Phaser.Keyboard.DOWN);
        
        leftKey.onDown.add(accLeft);
        rightKey.onDown.add(accRight);
        leftKey.onUp.add(stopMovement);
        rightKey.onUp.add(stopMovement);
        upKey.onUp.add(gunUp);
        downKey.onUp.add(gunDown);
    }

    function update() {
        
    }
    
    function accRight() {
        tank_chassis.body.velocity.x = 50;
        tank_chassis.animations.play('rollfw', 30, true);
        tank_gun.body.velocity.x = 50;
    }
    
    function accLeft() {
        tank_chassis.body.velocity.x = -50;
        tank_chassis.animations.play('rollbk', 30, true);
        tank_gun.body.velocity.x = -50;
    }
    
    function stopMovement() {
        tank_chassis.body.velocity.x = 0;
        tank_chassis.animations.stop();
        tank_gun.body.velocity.x = 0;
    }
    
    function gunUp() {
        if(gun_frame < 4) {
            gun_frame ++;
            tank_gun.frame = gun_frame;
        }
    }
    
    function gunDown() {
        if(gun_frame > 0) {
            gun_frame--;
            tank_gun.frame = gun_frame;
        }
    }
}
