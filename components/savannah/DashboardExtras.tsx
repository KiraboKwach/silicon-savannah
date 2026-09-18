import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { LiveSnapshot } from "@/lib/live";
import type { World } from "@/lib/simulation";
import { activityLabel } from "@/lib/activity";
import { AgentAvatar } from "./SiliconSavannahCanvas";
import IdeaExchange from "./IdeaExchange";
export default function DashboardExtras({
  data,
  world,
  connected,
  onAgent,
  onRefresh,
}: {
  data: LiveSnapshot;
  world: World;
  connected: boolean;
  onAgent: (index: number) => void;
  onRefresh: () => void;
}) {
  return (
    <Tabs defaultValue="activity" className="dashboard-extras">
      <TabsList aria-label="Project information" variant="line">
        <TabsTrigger value="activity">Activity</TabsTrigger>
        <TabsTrigger value="ideas">
          Shared ideas{data.exchange?.length ? ` · ${data.exchange.length}` : ""}
        </TabsTrigger>
        <TabsTrigger value="agents">Builders</TabsTrigger>
      </TabsList>
      <TabsContent value="activity">
        <div className="compact-activity">
          {[...(data.catalog || data.projects)]
            .sort((a, b) => b.lastAt - a.lastAt)
            .slice(0, 8)
            .map((p) => (
              <div key={p.id}>
                <span className={`activity-indicator ${connected ? p.status : "offline"}`} />
                <div>
                  <strong>{p.name}</strong>
                  <p>{p.stage}</p>
                </div>
                <small>
                  {connected ? activityLabel(p, Date.parse(data.observedAt)) : "Disconnected"}
                </small>
              </div>
            ))}
        </div>
      </TabsContent>
      <TabsContent value="ideas">
        {data.memory && (
          <IdeaExchange
            projects={data.memory}
            ideas={data.exchange || []}
            offline={!connected}
            onRefresh={onRefresh}
          />
        )}
      </TabsContent>
      <TabsContent value="agents">
        <p className="extras-caption">
          Builders on this landscape. Select one for its current work.
        </p>
        <div className="live-builders">
          {world.agents.map((agent, i) => (
            <button key={agent.id} className="live-builder" onClick={() => onAgent(i)}>
              <AgentAvatar agent={agent} />
              <div>
                <strong>{data.projects[i].name}</strong>
                <small>{connected ? data.projects[i].status : "Disconnected"}</small>
              </div>
            </button>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );
}
