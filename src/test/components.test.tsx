import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";

describe("Componentes Oficiais Shadcn/ui", () => {
  it("renderiza Table, TableHeader, TableRow e TableCell corretamente", () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Nome</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>01/08/2026</TableCell>
            <TableCell>Lead Teste</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    expect(screen.getByText("Data")).toBeInTheDocument();
    expect(screen.getByText("Nome")).toBeInTheDocument();
    expect(screen.getByText("01/08/2026")).toBeInTheDocument();
    expect(screen.getByText("Lead Teste")).toBeInTheDocument();
  });

  it("renderiza Tabs e dispara evento de seleção", () => {
    const onValueChange = vi.fn();
    render(
      <Tabs defaultValue="all" onValueChange={onValueChange}>
        <TabsList>
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="fernando">Fernando</TabsTrigger>
        </TabsList>
      </Tabs>
    );

    expect(screen.getByText("Todos")).toBeInTheDocument();
    const fernandoTab = screen.getByText("Fernando");
    expect(fernandoTab).toBeInTheDocument();

    fireEvent.mouseDown(fernandoTab, { button: 0, ctrlKey: false });
    expect(onValueChange).toHaveBeenCalledWith("fernando");
  });

  it("renderiza Input e reage a digitação", () => {
    const onChange = vi.fn();
    render(
      <Input
        placeholder="Pesquisar por nome ou telefone..."
        onChange={onChange}
      />
    );

    const input = screen.getByPlaceholderText("Pesquisar por nome ou telefone...");
    expect(input).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "Carlos" } });
    expect(onChange).toHaveBeenCalled();
  });

  it("renderiza Badge com estilo outline", () => {
    render(<Badge variant="outline">Roberto</Badge>);
    const badge = screen.getByText("Roberto");
    expect(badge).toBeInTheDocument();
  });

  it("renderiza Pagination e aciona botões de navegação", () => {
    const onPrevious = vi.fn();
    const onNext = vi.fn();

    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <Button variant="outline" size="sm" onClick={onPrevious}>
              Anterior
            </Button>
          </PaginationItem>
          <PaginationItem>
            <span>1 / 5</span>
          </PaginationItem>
          <PaginationItem>
            <Button variant="outline" size="sm" onClick={onNext}>
              Próxima
            </Button>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );

    expect(screen.getByText("1 / 5")).toBeInTheDocument();
    const prevBtn = screen.getByText("Anterior");
    const nextBtn = screen.getByText("Próxima");

    fireEvent.click(prevBtn);
    expect(onPrevious).toHaveBeenCalledTimes(1);

    fireEvent.click(nextBtn);
    expect(onNext).toHaveBeenCalledTimes(1);
  });
});
