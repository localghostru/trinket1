function trinket1game() {
    
    var game = new Phaser.Game(400, 300, Phaser.AUTO, '', {preload: preload, create: create, update: update, render: render});
    
    var firePoint = [56, 41];
    const MIN_BOMB_DISTANCE = 40;
    const MAX_BOMB_DISTANCE = 120;
    const MIN_BOMB_VERTICAL_GAP = 60;
    const MAX_AMMO = 8;
    const FULL_HEALTH = 1000;
    const FIRING_DELAY = 3000;
    const INITIAL_DISTANCE = 5000;
    const HULL_HEIGHT = 80;

    function preload() {
        game.load.spritesheet('sub', 'assets/sprites/sub.png', 70, 50);
        game.load.image('missile', 'assets/sprites/missile.png');
        game.load.image('bomb', 'assets/sprites/bomb.png');
        game.load.spritesheet('bombexplosion', 'assets/sprites/explosion7.png', 32, 32);
        game.load.image('bubble', 'assets/sprites/bubble.png');
        game.load.image('bgtile', 'assets/sprites/backtile.png');
        
        game.load.audio('fire', 'assets/sounds/fire_missile.ogg');
        game.load.audio('boom', 'assets/sounds/explosion.ogg');
        game.load.audio('ticks', 'assets/sounds/ammo_ticks.ogg');
    }

    function create() {
        game.add.tileSprite(0, 0, 400, 300, 'bgtile');
        game.world.width = 400 + 2 * MAX_BOMB_DISTANCE; //to be sure
        
        sub = game.add.sprite(25, 100, 'sub');
        sub.animations.add('move', [0, 1, 2, 3, 2, 1]);
        sub.animations.play('move', 8, true);
        sub.body.collideWorldBounds = true;
        sub.body.setSize(70, 60, 5, -5);
        
        missile = game.add.sprite(-20, -20, 'missile');
        missile.visible = false;
        missile.outOfBoundsKill = true;
        missile.body.setSize(20, 18, 0, -6);
        missile.body.drag.setTo(0, 100);
        
        missileFireSound = game.add.audio('fire', 0.8);
        
        bombs = game.add.group();
        bombs.createMultiple(20, 'bomb');
        bombs.setAll('outOfBoundsKill', true);
        var bomb = bombs.getFirstDead();
        bomb.reset(330, 100 + Math.random()*100);
        
        bombExplodeSound = game.add.audio('boom', 0.8);
        
        explosions = game.add.group();
        explosions.createMultiple(10, 'bombexplosion');
        explosions.forEach(function(item) { 
            item.body.setSize(96, 96, -32, -32);
            item.animations.add('run');
            
            item.events.onAnimationComplete = new Phaser.Signal();
            item.events.onAnimationComplete.add(function(sprite, anim) {
                game.physics.overlap(sprite, bombs, explosionHitsBomb, null, this);
                sprite.kill();
                
                var em = getFreeEmitter();
                em.x = sprite.x + 16;
                em.y = sprite.y + 16;
                em.setAll('alpha', 1);
                em.forEach(disappear, 1000);
                em.start(true, 2000, 0, 100);
            });
        });
        
        bombSpawner = game.add.sprite(400, 0, 'bomb');  //Could be anything
        bombSpawner.visible = false;
        
        ammunition = game.add.group();
        for(var i = 0; i < MAX_AMMO; i++)
            ammunition.create(5, 24 + i * 8, 'missile');
        ammunition.setAll('alpha', 0.5);
        
        ammoTicksSound = game.add.audio('ticks', 0.6);
        
        hull = game.add.graphics(5, 190);
        hull.beginFill("0x00ff00", "0.75");
        hull.drawRect(0, 0, 20, HULL_HEIGHT);
        hull.endFill();
        
        bestResult = '';
        game.add.text(5, 5, 'Ammo', { font: '14px Courier', fill: '#0' });
        game.add.text(5, 275, 'Hull', { font: '14px Courier', fill: '#0' });
        game.add.text(200, 5, 'Distance to safety:', { font: '14px Courier', fill: '#0' });
        labelDist = game.add.text(360, 5, '5000', { font: '14px Courier', fill: '#0' });
        labelBest = game.add.text(256, 20, 'Best result:', { font: '14px Courier', fill: '#0' });
        labelBest.visible = false;
        labelTitle = game.add.text(100, 60, "ESCAPE MISSION",
                                   {font: '24px Courier', fill:'#a0a0a0', stroke:'#00f', strokeThickness:'1'});
        labelStart = game.add.text(80, 100, "Avoid the bombs\nDon't move too close\n\nMove with up/down arrows\nFire missiles with SPACE\nAmmo is very limited\n\nPress SPACE to start",
                                   {font: '16px Courier', fill:'#fff', align: 'center'});
        labelLost = game.add.text(80, 100, "Game Over\n\nYour sub was destroyed\n\nPress SPACE to restart",
                                   {font: '16px Courier', fill:'#fff', align: 'center'});
        labelWon = game.add.text(80, 100, "Congratulations!\n\nYou are safe now!\n\nPress SPACE to restart",
                                   {font: '16px Courier', fill:'#fff', align: 'center'});
        labelLost.visible = labelWon.visible = false;
        
        gameRunning = false;
        
        upKey = game.input.keyboard.addKey(Phaser.Keyboard.UP);
        downKey = game.input.keyboard.addKey(Phaser.Keyboard.DOWN);
        fireKey = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
        
        upKey.onDown.add(moveUp);
        downKey.onDown.add(moveDown);
        upKey.onUp.add(stopVerticalMovement);
        downKey.onUp.add(stopVerticalMovement);
        fireKey.onDown.add(fire);
        
        fired = false;
        
        prepareEmitters();
    }

    function update() {
        if(!gameRunning) return;
        
        distance += currVel / 200;
        labelDist.content = distance.toFixed();
        
        if(distance <= 0) {
            labelDist.content = 'safe';
            gameWon();
        }
        
        if(bombSpawner.x <= 400 &&
          distance > 430) {       // Winning condition: distance should be 0 when passing last bomb, guessed.
            bomb = bombs.getFirstDead();
            bombX = 400 + (MIN_BOMB_DISTANCE + Math.random() * (MAX_BOMB_DISTANCE - MIN_BOMB_DISTANCE));
            do {
                bombY = 10 + Math.random()*(300 - 50);
            }
            while (Math.abs(bombY - lastBombY) < 40);
            lastBombY = bombY;
            
            bomb.reset(bombX, bombY);
            currVel -= 0.25;
            bombs.setAll('body.velocity.x', currVel);
            bombSpawner.x = bombX;
            bombSpawner.body.velocity.x = currVel;
        }
        game.physics.overlap(sub, bombs, subHitsBomb, null, this);
        game.physics.overlap(missile, bombs, missileHitsBomb, null, this);
        game.physics.overlap(sub, explosions, damageHull, null, this);
    }
    
    function render() {
    }
    
    function initGame() {
        ammoCount = MAX_AMMO;
        hullHealth = FULL_HEALTH;
        distance = INITIAL_DISTANCE;
        
        game.tweens.removeAll();
        sub.alpha = 1;
        sub.body.velocity.x = 0;
        sub.scale.x = sub.scale.y = 1;
        sub.reset(25, 100);
        
        var bomb;
        bomb = bombs.getFirstDead();
        bomb.reset(400, 10 + Math.random()*(300 - 50));
        lastBombY = bomb.y;
        
        var ammo;
        ammunition.callAll('kill');
        for(var i = 0; i < ammoCount; i++) {
            ammo = ammunition.getFirstDead();
            ammo.reset(5, 24 + i * 8);
        }
        
        currVel = -40;
        bombs.setAll('body.velocity.x', currVel);
        
        hull.clear();
        hull.beginFill("0x00ff00", "0.75");
        hull.drawRect(0, 0, 20, HULL_HEIGHT);
        hull.endFill();
        
        bombSpawner.x = bomb.x;
        bombSpawner.body.velocity.x = currVel;
        
        lastFireTime = game.time.now - FIRING_DELAY;
        labelDist.content = distance;
        labelTitle.visible = labelLost.visible = labelWon.visible = labelStart.visible = false;
        
        if(bestResult != '') {
            labelBest.content = 'Best result: ' + bestResult;
            labelBest.visible = true;
        }   
        
        gameRunning = true;
    }
    
    function stopGame() {
        bombs.callAll('kill');
        missile.kill();
        missile.reset(-20, -20);
        explosions.callAll('kill');
        gameRunning = false;
    }
    
    function gameLost() {
        stopGame();
        game.add.tween(sub).to({alpha: 0}, 1500, Phaser.Easing.Quadratic.In, true, 0);
        labelTitle.visible = labelLost.visible = true;
        bestResult = distance.toFixed(0);
    }
    
    function gameWon() {
        stopGame();
        game.add.tween(sub.body.velocity).to({x: 1000}, 4000, Phaser.Easing.Quadratic.In, true, 0);
        game.add.tween(sub.scale).to({x: 0.01, y:0.01}, 4000, Phaser.Easing.Quadratic.In, true, 0);
        labelTitle.visible = labelWon.visible = true;
        bestResult = 'win';
    }
    
    function moveUp() {
        if(!gameRunning) return;
        sub.body.velocity.y = -80;
    }
    
    function moveDown() {
        if(!gameRunning) return;
        sub.body.velocity.y = 80;
    }
    
    function stopVerticalMovement() {
        sub.body.velocity.y = 0;
    }
    
    function fire() {
        if(!gameRunning) {
            initGame();
            return;
        }
        
        if(game.time.now - lastFireTime < FIRING_DELAY) {
            return;
        }
        
        if(ammunition.countLiving() == 0) {
            return;
        }
        
        // Animate firing missile
        missile.reset(sub.x + firePoint[0], sub.y + firePoint[1]);
        //missile.reset(missile.body.x, missile.body.y);
        console.log(missile.x, missile.y, missile.body.x, missile.body.y);
        
        missile.body.velocity.y = sub.body.velocity.y;
        missile.body.velocity.x = 0;
        game.add.tween(missile.body.velocity).to({ x: 150 }, 500, Phaser.Easing.Quadratic.In, true, 0);
        missileFireSound.play();
        
        // Animate ammo
        ammo = ammunition.getFirstAlive();
        ammo.kill();
        ammunition.forEachAlive(function(item) {
                                    game.add.tween(item).to({ y: '-8'}, FIRING_DELAY,
                                                            Phaser.Easing.Linear.None, true, 0);
                                }, this);
        ammoTicksSound.play();
        
        lastFireTime = game.time.now;
    }
    
    function subHitsBomb(_sub, _bomb) {
        createExplosion(_bomb);
    }
    
    function missileHitsBomb(_missile, _bomb) {
        _missile.kill();
        _missile.reset(-20, -20);
        createExplosion(_bomb);
    }
    
    function explosionHitsBomb(_expl, _bomb) {
        createExplosion(_bomb);
    }
    
    function createExplosion(_bomb) {
        expl = explosions.getFirstDead();
        expl.reset(_bomb.x - 1, _bomb.y - 1);
        expl.animations.play('run', 60, false, false);
        
        bombExplodeSound.play();
        _bomb.kill();
    }
    
    function disappear(sprite, time) {
        game.add.tween(sprite).to({ alpha: 0 }, time, Phaser.Easing.Quadratic.In, true, 0);
    }
    
    function damageHull(_sub, _expl) {
        dist = Math.pow((_sub.x + 35) - (_expl.x + 16), 2) + Math.pow((_sub.y + 25) - (_expl.y + 16), 2);
        dist = Math.pow(dist, 0.5);
        
        hullHealth -= 1000 / dist;
        if(hullHealth < 0) hullHealth = 0;
        
        color = (0xff * Math.pow((FULL_HEALTH - hullHealth) / FULL_HEALTH, 0.25)).toFixed(0) * Math.pow(2, 16) + 
                (0xff * Math.pow(hullHealth / FULL_HEALTH, 0.25)).toFixed(0) * Math.pow(2, 8);
        
        hull.clear();
        hull.beginFill(color, "0.75");
        hull.drawRect(0, HULL_HEIGHT * (1 -  hullHealth / FULL_HEALTH), 
                      20, HULL_HEIGHT * hullHealth / FULL_HEALTH);
        hull.endFill();
        
        if(hullHealth == 0) {
            _expl.events.onAnimationComplete.addOnce(gameLost);
        }
    }
    
    function prepareEmitters() {
        emGroup = [];
        for(var i = 0; i < 10; i++) {
            var em = game.add.emitter(0, 0, 100);
            em.makeParticles('bubble');
            em.minParticleSpeed.setTo(-30, -40);
            em.maxParticleSpeed.setTo(30, 40);
            em.particleDrag.setTo(25, 20);
            em.minParticleScale = 0.22;
            em.maxParticleScale = 0.55;
            em.gravity = -2;

            emGroup.push(em);
        }
    }
    
    function getFreeEmitter() {
        emGroup.push(emGroup[0]);
        return emGroup.shift();
    }
}
