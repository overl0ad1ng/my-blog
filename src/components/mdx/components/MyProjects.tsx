import ProjectCard from "@/components/ProjectCard";

export default function MyProjects() {
  return (
    <div className="space-y-6 font-sans">
      <h1 className="pt-6 text-2xl font-medium">
        My Projects
      </h1>
      <div className="grid grid-cols-2 gap-6">
        <ProjectCard
          href="/projects/code-altas"
          title="Code Altas"
          logo="/projects/code-altas/logo.png"
          screenshot="/projects/code-altas/screenshot.png"
          date="2026/10/04"
          tags={[
            "React",
            "Documentation"
          ]}
        />
        <ProjectCard
          href="/projects/reverie"
          title="Rêverie"
          logo="/projects/reverie/logo.png"
          screenshot="NONE"
          date="2026/09/28"
          tags={[
            "JS",
            "Canvas",
            "Raster"
          ]}
        />
      </div>
    </div>
  )
}
