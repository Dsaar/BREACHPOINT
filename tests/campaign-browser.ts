import * as THREE from 'three';
import { Game } from '../lib/game/Game';
import { campaign } from '../lib/game/Campaign';
import {
  CampaignProgress,
  LocalProgressStore,
} from '../lib/game/CampaignProgress';
/** QA-only, isolated save key. Exercises actual world loading and completion callbacks.
 * Combat outcomes are simulated here; weapon/skinning mechanics use validateGame.
 */
export async function validateCampaign(report: (message: string) => void) {
  const key = `breachpoint.qa.${Date.now()}`;
  let service = new CampaignProgress(new LocalProgressStore(key));
  const snapshots: string[] = [];
  const checks: string[] = [];
  const check = (ok: boolean, label: string) => {
    if (!ok) throw new Error(label);
    checks.push(label);
  };
  try {
    check(
      service.value.highestUnlocked === 1,
      'Fresh browser save: only Mission 01 available',
    );
    for (const mission of campaign) {
      report(`Loading ${mission.id}/6 — ${mission.title}`);
      service.launch(mission.id);
      const container = document.createElement('div');
      container.style.cssText =
        'position:fixed;left:-200vw;top:0;width:100vw;height:100vh';
      document.body.appendChild(container);
      let game: Game | undefined;
      try {
        await new Promise<void>((resolve, reject) => {
          const timeout = window.setTimeout(
            () => reject(new Error('Campaign model loading timed out')),
            45000,
          );
          game = new Game(
            container,
            (state) => {
              if (state.error) {
                clearTimeout(timeout);
                reject(new Error(state.error));
              }
              if (state.loaded) {
                clearTimeout(timeout);
                resolve();
              }
            },
            mission,
            (id) => service.complete(id),
          );
        });
        const g = game!;
        check(
          g.loaded && g.mission.map === mission.map,
          `${mission.title}: correct world and real GLBs loaded`,
        );
        const camera = new THREE.PerspectiveCamera(
          65,
          g.camera.aspect,
          0.05,
          180,
        );
        camera.position.set(mission.spawn[0], 2.7, mission.spawn[1]);
        camera.lookAt(0, 3, -12);
        g.renderer.render(g.scene, camera);
        snapshots.push(g.renderer.domElement.toDataURL('image/png'));
        g.reset();
        g.active = true;
        for (let index = 0; index < mission.objectives.length; index++) {
          check(
            g.director.index === index,
            `${mission.title}: objective ${index + 1}`,
          );
          const objective = g.director.objective;
          if (objective.wave !== undefined)
            check(
              g
                .enemies!.enemies.filter((e) => e.wave === objective.wave)
                .every((e) => !e.dormant),
              `${mission.title}: reinforcements activated`,
            );
          // Isolate objective logic from aiming skill. No real save receives these outcomes.
          for (const enemy of g.enemies!.enemies)
            if (!enemy.dormant) enemy.health = 0;
          g.player.position.set(
            objective.position[0],
            0,
            objective.position[1],
          );
          g.player.keys.add('KeyE');
          for (
            let frame = 0;
            frame < (objective.seconds ?? 1) * 60 + 2 &&
            g.director.index === index &&
            !g.ended;
            frame++
          )
            g.updateMission(1 / 60);
        }
        check(
          g.ended === 'MISSION COMPLETE' && !g.active,
          `${mission.title}: mission completion stops simulation`,
        );
        check(
          service.value.completed.includes(mission.id),
          `${mission.title}: completion callback saved progress`,
        );
        service = new CampaignProgress(new LocalProgressStore(key));
        check(
          service.value.highestUnlocked ===
            Math.min(mission.id + 1, campaign.length),
          `${mission.title}: localStorage reload preserves unlock`,
        );
        service.launch(1);
        service.complete(1);
        check(
          service.value.completed.length === mission.id,
          `${mission.title}: replay preserves progression`,
        );
      } finally {
        game?.dispose();
        container.remove();
      }
    }
    check(
      service.value.campaignCompleted,
      'Finale marks entire campaign complete',
    );
    return { checks, snapshots };
  } finally {
    localStorage.removeItem(key);
  }
}
