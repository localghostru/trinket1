function trinket1game() {
    
    var game = new Phaser.Game(400, 300, Phaser.AUTO, '', {preload: preload, create: create, update: update});

    function preload() {
        game.load.image('tank', 'assets/sprites/cartoontank.png');
    }

    function create() {
        tank = game.add.sprite(100, 100, 'tank');
        
        leftKey = game.input.keyboard.addKey(Phaser.Keyboard.LEFT);
        rightKey = game.input.keyboard.addKey(Phaser.Keyboard.RIGHT);
        
        leftKey.onDown.add(accLeft);
        rightKey.onDown.add(accRight);
    }

    function update() {
        
    }
    
    function accRight() {
        tank.body.velocity.x += 50;
    }
    
    function accLeft() {
        tank.body.velocity.x -= 50;
    }
}
