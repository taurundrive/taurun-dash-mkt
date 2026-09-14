import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/format";
import { InstagramPost } from "@/integrations/meta/fetchInstagramPosts";
import {
  Play,
  Layers,
  Image as ImageIcon,
  Heart,
  MessageCircle,
  Share2,
  ExternalLink,
  Flame,
  Users2,
} from "lucide-react";

interface Props {
  posts: InstagramPost[];
}

export function InstagramTopPosts({ posts }: Props) {
  // Garante ordenação defensiva por maior audiência (views para Reels / reach para outros)
  const sorted = [...posts].sort((a, b) => {
    const scoreA = (a.views && a.views > 0) ? a.views : (a.reach || 0);
    const scoreB = (b.views && b.views > 0) ? b.views : (b.reach || 0);
    return scoreB - scoreA;
  });
  const top3 = sorted.slice(0, 3);
  if (top3.length === 0) return null;

  return (
    <div className="space-y-3.5">
      <div className="flex items-center gap-2 px-0.5">
        <Flame className="w-4 h-4 text-white" />
        <h3 className="text-base font-semibold text-zinc-100">
          Top 3 Publicações em Destaque
        </h3>
        <span className="text-xs text-muted-foreground">
          — maior audiência do período
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        {top3.map((post, idx) => {
          const isReels = post.mediaType === "REELS";
          const isCarousel = post.mediaType === "CAROUSEL";
          const rankLabel = idx === 0 ? "#1 Mais Visto" : `#${idx + 1} Destaque`;
          const mainMetricLabel = isReels ? "Visualizações" : "Alcance Único";
          const mainMetricValue = isReels && post.views > 0 ? post.views : post.reach;

          return (
            <Card
              key={post.id}
              className="group bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:border-zinc-700/80 transition-all flex flex-col"
            >
              {/* Thumbnail com badges sobrepostos */}
              <div className="relative aspect-[16/10] sm:aspect-[4/3] bg-zinc-900 overflow-hidden">
                {post.thumbnailUrl ? (
                  <img
                    src={post.thumbnailUrl}
                    alt={post.caption || "Post Instagram"}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-600">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                )}

                {/* Gradiente escuro para legibilidade */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                {/* Badge de Ranking */}
                <div className="absolute top-3 left-3">
                  {idx === 0 ? (
                    <Badge className="bg-white text-zinc-950 hover:bg-zinc-100 font-bold text-xs px-2.5 py-0.5 shadow-md border-0">
                      {rankLabel}
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="bg-zinc-900/90 text-zinc-200 border border-border font-medium text-xs px-2.5 py-0.5 shadow-sm"
                    >
                      {rankLabel}
                    </Badge>
                  )}
                </div>

                {/* Badge do Formato */}
                <div className="absolute top-3 right-3">
                  <Badge
                    variant="outline"
                    className="bg-black/70 backdrop-blur-sm border-white/20 text-white text-[11px] font-medium px-2 py-0.5 flex items-center gap-1"
                  >
                    {isReels && <Play className="w-3 h-3 fill-current" />}
                    {isCarousel && <Layers className="w-3 h-3" />}
                    {!isReels && !isCarousel && <ImageIcon className="w-3 h-3" />}
                    <span>{isReels ? "Reels" : isCarousel ? "Carrossel" : "Foto"}</span>
                  </Badge>
                </div>

                {/* Métrica principal sobreposta na imagem */}
                <div className="absolute bottom-3 left-3 right-3 flex items-baseline justify-between text-white">
                  <div>
                    <p className="text-[11px] text-zinc-300 font-medium">
                      {mainMetricLabel}
                    </p>
                    <p className="text-2xl font-bold tracking-tight leading-none text-white tabular-nums drop-shadow-sm">
                      {formatNumber(mainMetricValue)}
                    </p>
                  </div>
                  {post.reach > 0 && isReels && (
                    <div className="text-right">
                      <p className="text-[10px] text-zinc-400">Alcance</p>
                      <p className="text-xs font-semibold text-zinc-200 tabular-nums">
                        {formatNumber(post.reach)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Corpo do Card */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  {post.isCollab && post.collaborators.length > 0 && (
                    <div className="mb-2">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-zinc-800/90 border border-border text-zinc-300 px-2 py-0.5 rounded-md shadow-sm">
                        <Users2 className="w-3 h-3 text-zinc-400 shrink-0" />
                        <span className="text-zinc-400">Collab:</span>
                        <span className="text-white font-semibold truncate max-w-[200px]">
                          @{post.collaborators.slice(0, 2).join(", @")}
                          {post.collaborators.length > 2 ? ` (+${post.collaborators.length - 2})` : ""}
                        </span>
                      </span>
                    </div>
                  )}
                  <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed font-normal">
                    {post.caption || "Sem legenda cadastrada nesta publicação."}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {new Date(post.timestamp).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                {/* Rodapé com métricas e link */}
                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-zinc-300 font-medium">
                      <Heart className="w-3.5 h-3.5 text-zinc-400" />
                      {formatNumber(post.likes)}
                    </span>
                    <span className="flex items-center gap-1 text-zinc-300 font-medium">
                      <MessageCircle className="w-3.5 h-3.5 text-zinc-400" />
                      {formatNumber(post.comments)}
                    </span>
                    {post.shares > 0 && (
                      <span className="flex items-center gap-1 text-zinc-300 font-medium">
                        <Share2 className="w-3.5 h-3.5 text-zinc-400" />
                        {formatNumber(post.shares)}
                      </span>
                    )}
                  </div>

                  <a
                    href={post.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors"
                  >
                    <span>Abrir</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
