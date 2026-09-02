import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { formatNumber, formatPercent } from "@/lib/format";
import { InstagramPost } from "@/integrations/meta/fetchInstagramPosts";
import {
  Play,
  Layers,
  Image as ImageIcon,
  ExternalLink,
  ArrowUpDown,
  Users2,
} from "lucide-react";

interface Props {
  posts: InstagramPost[];
}

type SortOption = "views" | "date" | "reach" | "likes";

export function InstagramPostsTable({ posts }: Props) {
  const [sortBy, setSortBy] = useState<SortOption>("views");

  const sorted = [...posts].sort((a, b) => {
    if (sortBy === "views") {
      const vA = a.views > 0 ? a.views : a.reach;
      const vB = b.views > 0 ? b.views : b.reach;
      return vB - vA;
    }
    if (sortBy === "reach") return b.reach - a.reach;
    if (sortBy === "likes") return b.likes - a.likes;
    // Data decrescente
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return (
    <Card className="p-6 bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      {/* Cabeçalho da Tabela com Seletor de Ordenação */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-2.5">
          <h3 className="text-base font-semibold text-zinc-100">
            Todas as publicações do período
          </h3>
          <Badge
            variant="outline"
            className="text-xs font-medium px-2 py-0.5 rounded-md bg-zinc-800/80 border-border text-zinc-300"
          >
            {posts.length} {posts.length === 1 ? "post" : "posts"}
          </Badge>
          {posts.some((p) => p.isCollab) && (
            <Badge
              variant="outline"
              className="text-xs font-medium px-2 py-0.5 rounded-md bg-zinc-800/80 border-border text-zinc-300 flex items-center gap-1"
            >
              <Users2 className="w-3 h-3 text-zinc-400" />
              <span>{posts.filter((p) => p.isCollab).length} em Collab</span>
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5" />
            Ordenar por:
          </span>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="h-8 w-[185px] text-xs font-medium rounded-lg bg-zinc-900 border border-border hover:bg-zinc-800/60 text-zinc-100 shadow-sm transition-colors">
              <SelectValue placeholder="Selecione a ordenação" />
            </SelectTrigger>
            <SelectContent className="bg-popover border border-border rounded-lg shadow-md">
              <SelectItem value="views" className="text-xs text-zinc-200 focus:bg-zinc-800 focus:text-white cursor-pointer py-1.5">
                Mais visualizados (Padrão)
              </SelectItem>
              <SelectItem value="date" className="text-xs text-zinc-200 focus:bg-zinc-800 focus:text-white cursor-pointer py-1.5">
                Mais recentes
              </SelectItem>
              <SelectItem value="reach" className="text-xs text-zinc-200 focus:bg-zinc-800 focus:text-white cursor-pointer py-1.5">
                Maior alcance
              </SelectItem>
              <SelectItem value="likes" className="text-xs text-zinc-200 focus:bg-zinc-800 focus:text-white cursor-pointer py-1.5">
                Mais curtidos
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabela Shadcn */}
      <div className="overflow-x-auto">
        <Table className="w-full text-sm">
          <TableHeader className="bg-zinc-900/50 [&_tr]:border-b-border">
            <TableRow className="border-b border-border hover:bg-transparent">
              <TableHead className="w-14 font-medium px-3 py-3 text-xs text-muted-foreground h-auto">
                Capa
              </TableHead>
              <TableHead className="font-medium px-4 py-3 text-xs text-muted-foreground h-auto min-w-[220px]">
                Legenda
              </TableHead>
              <TableHead className="font-medium px-3 py-3 text-xs text-muted-foreground h-auto">
                Formato
              </TableHead>
              <TableHead className="font-medium px-3 py-3 text-xs text-muted-foreground h-auto whitespace-nowrap">
                Data
              </TableHead>
              <TableHead className="font-medium px-3 py-3 text-xs text-muted-foreground text-right h-auto whitespace-nowrap">
                Visualizações
              </TableHead>
              <TableHead className="font-medium px-3 py-3 text-xs text-muted-foreground text-right h-auto whitespace-nowrap">
                Alcance
              </TableHead>
              <TableHead className="font-medium px-3 py-3 text-xs text-muted-foreground text-right h-auto whitespace-nowrap">
                Curtidas
              </TableHead>
              <TableHead className="font-medium px-3 py-3 text-xs text-muted-foreground text-right h-auto whitespace-nowrap">
                Comentários
              </TableHead>
              <TableHead className="font-medium px-3 py-3 text-xs text-muted-foreground text-right h-auto whitespace-nowrap">
                Shares / Saves
              </TableHead>
              <TableHead className="font-medium px-3 py-3 text-xs text-muted-foreground text-right h-auto whitespace-nowrap">
                Engajamento
              </TableHead>
              <TableHead className="w-10 font-medium px-3 py-3 text-xs text-muted-foreground text-center h-auto">
                Link
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((post) => {
              const isReels = post.mediaType === "REELS";
              const isCarousel = post.mediaType === "CAROUSEL";
              const formattedDate = new Date(post.timestamp).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <TableRow
                  key={post.id}
                  className="border-b border-border/60 hover:bg-zinc-800/30 transition-colors"
                >
                  {/* Capa */}
                  <TableCell className="px-3 py-2.5 align-middle">
                    <div className="w-11 h-11 rounded-lg bg-zinc-900 border border-border overflow-hidden shrink-0">
                      {post.thumbnailUrl ? (
                        <img
                          src={post.thumbnailUrl}
                          alt="Thumbnail"
                          className="w-full h-full object-cover"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-600">
                          <ImageIcon className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  </TableCell>

                  {/* Legenda e Colaboradores */}
                  <TableCell className="px-4 py-2.5 align-middle">
                    <a
                      href={post.permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-zinc-200 hover:text-white line-clamp-2 leading-snug transition-colors"
                      title={post.caption}
                    >
                      {post.caption || "Sem legenda cadastrada."}
                    </a>
                    {post.isCollab && post.collaborators.length > 0 && (
                      <div className="mt-1 flex items-center gap-1">
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-zinc-800/90 border border-border text-zinc-300 px-1.5 py-0.5 rounded-md">
                          <Users2 className="w-2.5 h-2.5 text-zinc-400 shrink-0" />
                          <span className="text-zinc-400">Collab:</span>
                          <span className="text-white font-medium">
                            @{post.collaborators.slice(0, 3).join(", @")}
                            {post.collaborators.length > 3 ? ` (+${post.collaborators.length - 3})` : ""}
                          </span>
                        </span>
                      </div>
                    )}
                  </TableCell>

                  {/* Formato */}
                  <TableCell className="px-3 py-2.5 align-middle whitespace-nowrap">
                    <Badge
                      variant="outline"
                      className="text-[11px] font-medium px-2 py-0.5 rounded-md border border-border bg-zinc-800/60 text-zinc-300 inline-flex items-center gap-1"
                    >
                      {isReels && <Play className="w-2.5 h-2.5 fill-current" />}
                      {isCarousel && <Layers className="w-2.5 h-2.5" />}
                      {!isReels && !isCarousel && <ImageIcon className="w-2.5 h-2.5" />}
                      <span>{isReels ? "Reels" : isCarousel ? "Carrossel" : "Foto"}</span>
                    </Badge>
                  </TableCell>

                  {/* Data */}
                  <TableCell className="px-3 py-2.5 align-middle text-xs text-muted-foreground whitespace-nowrap">
                    {formattedDate}
                  </TableCell>

                  {/* Visualizações */}
                  <TableCell className="px-3 py-2.5 align-middle text-right text-xs tabular-nums whitespace-nowrap">
                    {post.views > 0 ? (
                      <span className="font-bold text-white">
                        {formatNumber(post.views)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  {/* Alcance */}
                  <TableCell className="px-3 py-2.5 align-middle text-right text-xs font-medium text-zinc-200 tabular-nums whitespace-nowrap">
                    {formatNumber(post.reach)}
                  </TableCell>

                  {/* Curtidas */}
                  <TableCell className="px-3 py-2.5 align-middle text-right text-xs text-zinc-300 tabular-nums whitespace-nowrap">
                    {formatNumber(post.likes)}
                  </TableCell>

                  {/* Comentários */}
                  <TableCell className="px-3 py-2.5 align-middle text-right text-xs text-zinc-300 tabular-nums whitespace-nowrap">
                    {formatNumber(post.comments)}
                  </TableCell>

                  {/* Shares / Saves */}
                  <TableCell className="px-3 py-2.5 align-middle text-right text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                    <span className="text-zinc-300">{formatNumber(post.shares)}</span>
                    <span className="text-zinc-600 mx-1">/</span>
                    <span>{formatNumber(post.saved)}</span>
                  </TableCell>

                  {/* Taxa de Engajamento */}
                  <TableCell className="px-3 py-2.5 align-middle text-right whitespace-nowrap">
                    <Badge
                      variant="outline"
                      className="text-xs font-medium px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-200 border-border"
                    >
                      {formatPercent(post.engagementRate)}
                    </Badge>
                  </TableCell>

                  {/* Ação */}
                  <TableCell className="px-3 py-2.5 align-middle text-center whitespace-nowrap">
                    <a
                      href={post.permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center w-7 h-7 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                      title="Abrir no Instagram"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
