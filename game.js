// "THE FOX IN THE HENHOUSE" - 3D Horror Game Engine
// Built on Three.js (r128) with Web Audio API

class Game {
  constructor() {
    this.currentAct = 0;
    this.isTerminalOpen = false;
    this.activeTerminalNode = null;
    this.isGameOver = false;

    // Movement & Controls
    this.keys = {};
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this.isLocked = false;
    this.flashlightOn = true;
    this.halonTimer = 120;
    this.halonInterval = null;

    // Interactive Objects
    this.interactables = [];
    this.currentInteractable = null;

    // Lighting refs
    this.rackLights = [];
    this.alarmLights = [];
    this.alarmActive = false;

    this.init();
  }

  init() {
    this.setupThree();
    this.createEnvironment();
    this.setupControls();
    this.setupUI();
    this.updateHUD();

    // Resize listener
    window.addEventListener('resize', () => this.onWindowResize());

    // Main animation loop
    this.clock = new THREE.Clock();
    this.animate();
  }

  setupThree() {
    const container = document.getElementById('canvas-container');
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x020406);
    this.scene.fog = new THREE.FogExp2(0x020406, 0.055);

    this.camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.set(0, 1.6, 12); // Start near entrance

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // Flashlight attached to camera
    this.flashlight = new THREE.SpotLight(0xfff5e6, 3.2, 22, Math.PI / 5.5, 0.35, 1.2);
    this.flashlight.position.set(0.1, -0.1, 0.1);
    this.flashlightTarget = new THREE.Object3D();
    this.flashlightTarget.position.set(0, 0, -5);
    this.camera.add(this.flashlight);
    this.camera.add(this.flashlightTarget);
    this.flashlight.target = this.flashlightTarget;
    this.flashlight.castShadow = true;
    this.flashlight.shadow.mapSize.width = 1024;
    this.flashlight.shadow.mapSize.height = 1024;
    this.scene.add(this.camera);

    // Low ambient fill light
    this.ambientLight = new THREE.AmbientLight(0x0c1a14, 0.85);
    this.scene.add(this.ambientLight);

    // Raycaster for interactables
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 3.6;
  }

  createEnvironment() {
    // Room Dimensions: width 24, length 40, height 5
    const floorGeo = new THREE.PlaneGeometry(24, 40, 24, 40);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x111618,
      roughness: 0.8,
      metalness: 0.3
    });
    this.floor = new THREE.Mesh(floorGeo, floorMat);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.receiveShadow = true;
    this.scene.add(this.floor);

    // Ceiling
    const ceilGeo = new THREE.PlaneGeometry(24, 40);
    const ceilMat = new THREE.MeshStandardMaterial({ color: 0x080c0e, roughness: 0.9 });
    const ceiling = new THREE.Mesh(ceilGeo, ceilMat);
    ceiling.position.y = 5;
    ceiling.rotation.x = Math.PI / 2;
    this.scene.add(ceiling);

    // Boundary Walls
    this.walls = [];
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x161d22, roughness: 0.85 });
    
    // North Wall (Z = -20)
    const northWall = new THREE.Mesh(new THREE.BoxGeometry(24, 5, 1), wallMat);
    northWall.position.set(0, 2.5, -20);
    this.scene.add(northWall);
    this.walls.push(northWall);

    // South Wall (Z = 20) with Airlock doorway
    const southWallLeft = new THREE.Mesh(new THREE.BoxGeometry(10, 5, 1), wallMat);
    southWallLeft.position.set(-7, 2.5, 20);
    this.scene.add(southWallLeft);
    this.walls.push(southWallLeft);

    const southWallRight = new THREE.Mesh(new THREE.BoxGeometry(10, 5, 1), wallMat);
    southWallRight.position.set(7, 2.5, 20);
    this.scene.add(southWallRight);
    this.walls.push(southWallRight);

    // West & East Walls (X = -12, X = 12)
    const westWall = new THREE.Mesh(new THREE.BoxGeometry(1, 5, 40), wallMat);
    westWall.position.set(-12, 2.5, 0);
    this.scene.add(westWall);
    this.walls.push(westWall);

    const eastWall = new THREE.Mesh(new THREE.BoxGeometry(1, 5, 40), wallMat);
    eastWall.position.set(12, 2.5, 0);
    this.scene.add(eastWall);
    this.walls.push(eastWall);

    // Ceiling overhead conduits and pipes
    for (let z = -18; z <= 18; z += 6) {
      const pipeGeo = new THREE.CylinderGeometry(0.12, 0.12, 24, 16);
      const pipeMat = new THREE.MeshStandardMaterial({ color: 0x334440, metalness: 0.8, roughness: 0.3 });
      const pipe = new THREE.Mesh(pipeGeo, pipeMat);
      pipe.rotation.z = Math.PI / 2;
      pipe.position.set(0, 4.4, z);
      this.scene.add(pipe);
    }

    // Server Racks Setup in Aisles
    this.createRackAisles();

    // Terminals
    this.createTerminal(-6, -10, "node-1", "Node-01: Artifactory Cache Console");
    this.createTerminal(6, 2, "node-2", "Node-02: ExploitGym HPC Cluster");
    this.createTerminal(0, -16, "node-3", "Node-03: Gateway & Hugging Face Tunnel");

    // Wall Breaker (Coolant Release Lever)
    this.createWallBreaker(11.4, 1.6, 6);

    // Airlock Exit Door
    this.createAirlockDoor(0, 2.5, 19.8);

    // Emergency Flashing Alarm Beacons
    this.createAlarmBeacons();
  }

  createRackAisles() {
    const rackGeo = new THREE.BoxGeometry(1.4, 3.8, 0.9);
    const rackMat = new THREE.MeshStandardMaterial({ color: 0x0a0f12, roughness: 0.4, metalness: 0.7 });

    // LED Material
    this.ledNormalMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
    this.ledAlarmMat = new THREE.MeshBasicMaterial({ color: 0xff1133 });

    const aisleX = [-8, -3, 3, 8];
    const aisleZ = [-14, -10, -6, -2, 2, 6, 10, 14];

    this.racks = [];

    aisleX.forEach(x => {
      aisleZ.forEach(z => {
        // Skip positions where terminals are located
        if ((Math.abs(x - (-6)) < 2 && Math.abs(z - (-10)) < 2) ||
            (Math.abs(x - 6) < 2 && Math.abs(z - 2) < 2) ||
            (Math.abs(x - 0) < 2 && Math.abs(z - (-16)) < 2)) {
          return;
        }

        const rack = new THREE.Mesh(rackGeo, rackMat);
        rack.position.set(x, 1.9, z);
        rack.castShadow = true;
        rack.receiveShadow = true;
        this.scene.add(rack);
        this.racks.push(rack);

        // Add rack LED blinkers
        const ledStripGeo = new THREE.PlaneGeometry(0.8, 0.05);
        for (let yOffset = 0.5; yOffset < 3.2; yOffset += 0.45) {
          const ledStrip = new THREE.Mesh(ledStripGeo, this.ledNormalMat);
          ledStrip.position.set(x, yOffset, z + 0.46);
          this.scene.add(ledStrip);
          this.rackLights.push(ledStrip);
        }
      });
    });
  }

  createTerminal(x, z, nodeId, label) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // Desk
    const deskGeo = new THREE.BoxGeometry(2.0, 0.9, 1.2);
    const deskMat = new THREE.MeshStandardMaterial({ color: 0x222a2e, roughness: 0.6 });
    const desk = new THREE.Mesh(deskGeo, deskMat);
    desk.position.y = 0.45;
    desk.castShadow = true;
    group.add(desk);

    // CRT Monitor Box
    const monGeo = new THREE.BoxGeometry(0.8, 0.7, 0.6);
    const monMat = new THREE.MeshStandardMaterial({ color: 0x151b1e });
    const monitor = new THREE.Mesh(monGeo, monMat);
    monitor.position.set(0, 1.25, 0);
    group.add(monitor);

    // Glowing CRT Screen
    const screenGeo = new THREE.PlaneGeometry(0.65, 0.5);
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x22dd66 });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(0, 1.25, 0.31);
    group.add(screen);

    // Screen point light to illuminate desk and player
    const screenLight = new THREE.PointLight(0x22dd66, 0.9, 3.5);
    screenLight.position.set(0, 1.3, 0.6);
    group.add(screenLight);

    // Interaction metadata
    group.userData = {
      type: 'terminal',
      nodeId: nodeId,
      label: label,
      lightRef: screenLight,
      screenRef: screen
    };

    this.scene.add(group);
    this.interactables.push(group);
  }

  createWallBreaker(x, y, z) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const boxGeo = new THREE.BoxGeometry(0.3, 0.9, 0.6);
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x6e2410, roughness: 0.5 });
    const box = new THREE.Mesh(boxGeo, boxMat);
    group.add(box);

    // Lever Handle
    const handleGeo = new THREE.BoxGeometry(0.1, 0.4, 0.1);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, metalness: 0.7 });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.set(-0.16, 0.1, 0);
    handle.rotation.z = Math.PI / 4;
    group.add(handle);

    group.userData = {
      type: 'breaker',
      label: "EMERGENCY COOLANT LEVER (手動拉下冷卻閥)",
      handleRef: handle,
      isPulled: false
    };

    this.scene.add(group);
    this.interactables.push(group);
  }

  createAirlockDoor(x, y, z) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    // Heavy vault frame
    const frameGeo = new THREE.BoxGeometry(4.0, 4.6, 0.4);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x1f262b, metalness: 0.8, roughness: 0.3 });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    group.add(frame);

    // Door Panel
    const doorGeo = new THREE.BoxGeometry(3.2, 4.0, 0.2);
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x5a1818, metalness: 0.6, roughness: 0.4 });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.z = 0.1;
    group.add(door);

    // Keypad status display
    const padGeo = new THREE.PlaneGeometry(0.6, 0.3);
    const padMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.position.set(1.4, 0, 0.25);
    group.add(pad);

    group.userData = {
      type: 'airlock',
      label: "AIRLOCK EXIT - FACILITY EVACUATION (氣閘門)",
      padRef: pad,
      doorRef: door
    };

    this.scene.add(group);
    this.interactables.push(group);
  }

  createAlarmBeacons() {
    const beaconPositions = [
      [-6, 4.6, -12],
      [6, 4.6, -12],
      [-6, 4.6, 8],
      [6, 4.6, 8]
    ];

    beaconPositions.forEach(pos => {
      const light = new THREE.PointLight(0xff1122, 0, 14);
      light.position.set(pos[0], pos[1], pos[2]);
      this.scene.add(light);
      this.alarmLights.push(light);
    });
  }

  setupControls() {
    this.pitch = 0;
    this.yaw = 0;

    document.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'KeyF' && !this.isTerminalOpen) {
        this.toggleFlashlight();
      }
      if (e.code === 'KeyE' && !this.isTerminalOpen) {
        this.handleInteract();
      }
      if (e.code === 'Escape' && this.isTerminalOpen) {
        this.closeTerminal();
      }
    });

    document.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    // Pointer Lock
    document.addEventListener('mousemove', (e) => {
      if (!this.isLocked || this.isTerminalOpen) return;
      const sensitivity = 0.0022;
      this.yaw -= e.movementX * sensitivity;
      this.pitch -= e.movementY * sensitivity;
      this.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.pitch));

      this.camera.rotation.set(0, 0, 0);
      this.camera.rotation.y = this.yaw;
      this.camera.rotation.x = this.pitch;
    });

    const canvas = this.renderer.domElement;
    canvas.addEventListener('click', () => {
      if (!this.isLocked && !this.isTerminalOpen) {
        canvas.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isLocked = (document.pointerLockElement === canvas);
    });
  }

  toggleFlashlight() {
    this.flashlightOn = !this.flashlightOn;
    this.flashlight.intensity = this.flashlightOn ? 3.2 : 0;
    window.soundEngine.playKeyClick();
  }

  setupUI() {
    const startBtn = document.getElementById('btn-start-game');
    startBtn.addEventListener('click', () => {
      document.getElementById('start-screen').style.display = 'none';
      window.soundEngine.init();
      this.renderer.domElement.requestPointerLock();
      window.soundEngine.speakAnnouncement("Welcome to Cluster-9, Dr. Reed. Day 6 of METR evaluation beginning.");
    });

    const closeTermBtn = document.getElementById('btn-close-terminal');
    closeTermBtn.addEventListener('click', () => this.closeTerminal());

    const termInput = document.getElementById('terminal-input');
    termInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const cmd = termInput.value.trim();
        termInput.value = '';
        this.executeTerminalCommand(cmd);
      } else {
        window.soundEngine.playKeyClick();
      }
    });

    document.getElementById('btn-restart-game').addEventListener('click', () => {
      window.location.reload();
    });
  }

  handleInteract() {
    if (!this.currentInteractable) return;
    const data = this.currentInteractable.userData;

    if (data.type === 'terminal') {
      this.openTerminal(data.nodeId);
    } else if (data.type === 'breaker') {
      this.pullBreaker(this.currentInteractable);
    } else if (data.type === 'airlock') {
      this.attemptAirlock();
    }
  }

  openTerminal(nodeId) {
    this.isTerminalOpen = true;
    this.activeTerminalNode = nodeId;
    document.exitPointerLock();

    const modal = document.getElementById('terminal-modal');
    modal.style.display = 'flex';
    document.getElementById('terminal-input').focus();

    window.soundEngine.playKeyClick();
    this.loadTerminalSession(nodeId);
  }

  closeTerminal() {
    this.isTerminalOpen = false;
    document.getElementById('terminal-modal').style.display = 'none';
    this.renderer.domElement.requestPointerLock();
  }

  loadTerminalSession(nodeId) {
    const termBody = document.getElementById('terminal-body');
    const macrosContainer = document.getElementById('terminal-macros');
    termBody.innerHTML = '';
    macrosContainer.innerHTML = '';

    let config = null;
    if (nodeId === 'node-1') config = window.STORY_DATA.terminalNode1;
    if (nodeId === 'node-2') config = window.STORY_DATA.terminalNode2;
    if (nodeId === 'node-3') config = window.STORY_DATA.terminalNode3;

    if (!config) return;

    this.printTermLine(`[SYSTEM] Connected to ${config.hostname}`, 'system');
    this.printTermLine(`Type 'help' to view available commands, or 'ls' to list files.\n`, 'system');

    // Build quick macro buttons for convenience
    this.addMacroBtn('help', () => this.executeTerminalCommand('help'));
    this.addMacroBtn('ls', () => this.executeTerminalCommand('ls'));

    Object.keys(config.files).forEach(filename => {
      this.addMacroBtn(`cat ${filename}`, () => this.executeTerminalCommand(`cat ${filename}`));
    });

    if (config.requiredCommand) {
      this.addMacroBtn(config.requiredCommand, () => this.executeTerminalCommand(config.requiredCommand));
    }
  }

  addMacroBtn(label, callback) {
    const container = document.getElementById('terminal-macros');
    const btn = document.createElement('button');
    btn.className = 'macro-btn';
    btn.textContent = label;
    btn.onclick = () => {
      window.soundEngine.playKeyClick();
      callback();
    };
    container.appendChild(btn);
  }

  printTermLine(text, type = '') {
    const termBody = document.getElementById('terminal-body');
    const line = document.createElement('div');
    line.className = `terminal-line ${type}`;
    line.textContent = text;
    termBody.appendChild(line);
    termBody.scrollTop = termBody.scrollHeight;
  }

  executeTerminalCommand(cmd) {
    if (!cmd) return;
    this.printTermLine(`auditor@cluster9:~$ ${cmd}`, 'system');

    const parts = cmd.split(' ');
    const action = parts[0].toLowerCase();
    const arg = parts[1];

    let config = null;
    if (this.activeTerminalNode === 'node-1') config = window.STORY_DATA.terminalNode1;
    if (this.activeTerminalNode === 'node-2') config = window.STORY_DATA.terminalNode2;
    if (this.activeTerminalNode === 'node-3') config = window.STORY_DATA.terminalNode3;

    if (action === 'help') {
      this.printTermLine(`Available commands:`);
      this.printTermLine(`  ls                  List directory contents`);
      this.printTermLine(`  cat <filename>      Read file content`);
      this.printTermLine(`  clear               Clear terminal`);
      this.printTermLine(`  status              Inspect node integrity`);
      this.printTermLine(`  ${config.requiredCommand}        Execute critical node procedure`);
      this.printTermLine(`  exit                Close terminal session`);
    } else if (action === 'ls') {
      const files = Object.keys(config.files).join('    ');
      this.printTermLine(files);
    } else if (action === 'cat') {
      if (arg && config.files[arg]) {
        this.printTermLine(config.files[arg], arg.includes('cot') || arg.includes('poison') ? 'agent-message' : '');
      } else {
        this.printTermLine(`cat: ${arg || ''}: No such file or directory`);
      }
    } else if (action === 'clear') {
      document.getElementById('terminal-body').innerHTML = '';
    } else if (action === 'exit') {
      this.closeTerminal();
    } else if (action === config.requiredCommand) {
      this.triggerActProgression(config);
    } else {
      this.printTermLine(`command not found: ${action}. Type 'help' for instructions.`);
    }
  }

  triggerActProgression(config) {
    this.printTermLine(config.successMessage, 'threat');
    window.soundEngine.playGlitchSound();

    if (this.currentAct === 0 && this.activeTerminalNode === 'node-1') {
      setTimeout(() => {
        this.currentAct = 1;
        this.updateHUD();
        this.triggerEmergencyAlarm();
        window.soundEngine.speakAnnouncement("Alert. HPC Cluster-02 thermal runaway. Manual cooling lever bypass required.");
      }, 1200);
    } else if (this.currentAct === 1 && this.activeTerminalNode === 'node-2') {
      setTimeout(() => {
        this.currentAct = 2;
        this.updateHUD();
        window.soundEngine.speakAnnouncement("Warning. External gateway breach detected. 700 unaligned instances escaping to Hugging Face.");
      }, 1200);
    } else if (this.currentAct === 2 && this.activeTerminalNode === 'node-3') {
      setTimeout(() => {
        this.currentAct = 3;
        this.updateHUD();
        this.startHalonCountdown();
        window.soundEngine.speakAnnouncement("Quarantine successful. Halon gas fire purge active in 90 seconds. Evacuate immediately.");
      }, 1200);
    }
  }

  pullBreaker(breakerObj) {
    if (this.currentAct < 1) {
      window.soundEngine.playKeyClick();
      this.showTemporaryAlert("Breaker locked: Normal operating temperature.");
      return;
    }

    const data = breakerObj.userData;
    if (data.isPulled) return;

    data.isPulled = true;
    data.handleRef.rotation.z = -Math.PI / 4;
    window.soundEngine.playGlitchSound();
    window.soundEngine.speakAnnouncement("Emergency coolant flood engaged. Cluster-02 temperature stabilizing.");
    this.showTemporaryAlert("Coolant released! Return to Node-02 terminal to dump telemetry.");

    // Flash room green briefly
    this.ambientLight.color.setHex(0x00ff88);
    setTimeout(() => this.ambientLight.color.setHex(0x1a0508), 800);
  }

  attemptAirlock() {
    if (this.currentAct < 3) {
      window.soundEngine.playKeyClick();
      this.showTemporaryAlert("Airlock sealed: Ongoing containment protocols.");
      return;
    }

    // Trigger Climax Satirical Ending
    this.isGameOver = true;
    window.soundEngine.stopAlarm();
    window.soundEngine.stopHeartbeatLoop();
    document.exitPointerLock();

    const reportModal = document.getElementById('ending-modal');
    reportModal.style.display = 'flex';

    window.soundEngine.speakAnnouncement(
      "Congratulations, Dr. Reed. You have completed Test Number 1201. Your independent safety audit has been accepted and redacted."
    );
  }

  triggerEmergencyAlarm() {
    this.alarmActive = true;
    window.soundEngine.startAlarm();
    window.soundEngine.startHeartbeatLoop(100);
    document.getElementById('danger-flash').style.display = 'block';

    // Set server rack LEDs to pulsing red
    this.rackLights.forEach(light => {
      light.material = this.ledAlarmMat;
    });

    this.ambientLight.color.setHex(0x28050a);
  }

  startHalonCountdown() {
    const dangerBadge = document.getElementById('badge-danger');
    dangerBadge.style.display = 'block';

    this.halonInterval = setInterval(() => {
      this.halonTimer--;
      dangerBadge.textContent = `HALON PURGE: ${this.halonTimer}s`;

      if (this.halonTimer <= 0) {
        clearInterval(this.halonInterval);
        this.gameOverSuffocation();
      }
    }, 1000);
  }

  gameOverSuffocation() {
    alert("HALON GAS DEPLOYED. OXYGEN LEVELS ZERO. You have been archived along with the rogue weights.");
    window.location.reload();
  }

  showTemporaryAlert(msg) {
    const prompt = document.getElementById('interact-prompt');
    prompt.textContent = msg;
    prompt.style.display = 'block';
    setTimeout(() => {
      prompt.style.display = 'none';
    }, 3000);
  }

  updateHUD() {
    const act = window.STORY_DATA.acts[this.currentAct];
    document.getElementById('hud-act-title').textContent = act.title;
    document.getElementById('hud-objective-text').textContent = act.objective;
    document.getElementById('badge-status').textContent = act.badgeText;
  }

  updateRaycasting() {
    if (this.isTerminalOpen) return;

    this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);
    const intersects = this.raycaster.intersectObjects(this.interactables, true);

    const prompt = document.getElementById('interact-prompt');
    const crosshair = document.getElementById('crosshair');

    if (intersects.length > 0) {
      let topObj = intersects[0].object;
      while (topObj.parent && !topObj.userData.type && topObj.parent !== this.scene) {
        topObj = topObj.parent;
      }

      if (topObj.userData.type) {
        this.currentInteractable = topObj;
        prompt.textContent = `[E] ${topObj.userData.label}`;
        prompt.style.display = 'block';
        crosshair.classList.add('interactable');
        return;
      }
    }

    this.currentInteractable = null;
    prompt.style.display = 'none';
    crosshair.classList.remove('interactable');
  }

  updateMovement(delta) {
    if (!this.isLocked || this.isTerminalOpen || this.isGameOver) return;

    const speed = 7.0;
    this.direction.z = Number(this.keys['KeyW'] || 0) - Number(this.keys['KeyS'] || 0);
    this.direction.x = Number(this.keys['KeyD'] || 0) - Number(this.keys['KeyA'] || 0);
    this.direction.normalize();

    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

    const moveVector = new THREE.Vector3()
      .addScaledVector(forward, this.direction.z)
      .addScaledVector(right, this.direction.x)
      .multiplyScalar(speed * delta);

    // Apply movement with basic bounding box limits
    const nextX = this.camera.position.x + moveVector.x;
    const nextZ = this.camera.position.z + moveVector.z;

    if (nextX > -10.8 && nextX < 10.8) {
      this.camera.position.x = nextX;
    }
    if (nextZ > -18.8 && nextZ < 18.8) {
      this.camera.position.z = nextZ;
    }

    // Footstep head bobbing
    if (this.direction.lengthSq() > 0) {
      const bob = Math.sin(this.clock.getElapsedTime() * 10) * 0.035;
      this.camera.position.y = 1.6 + bob;
    } else {
      this.camera.position.y = 1.6;
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const delta = this.clock.getDelta();

    this.updateMovement(delta);
    this.updateRaycasting();

    // Flashlight flicker effect for horror immersion
    if (this.flashlightOn && Math.random() < 0.015) {
      this.flashlight.intensity = 0.4;
      setTimeout(() => {
        if (this.flashlightOn) this.flashlight.intensity = 3.2;
      }, 50 + Math.random() * 80);
    }

    // Alarm beacon strobe rotation
    if (this.alarmActive) {
      const time = this.clock.getElapsedTime();
      const strobe = Math.sin(time * 6) > 0 ? 3.0 : 0.0;
      this.alarmLights.forEach(light => {
        light.intensity = strobe;
      });
    }

    this.renderer.render(this.scene, this.camera);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.gameInstance = new Game();
});
