import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { AuthFlow, type AuthMode } from "@/components/ui/auth-flow";

function Harness({
  onSubmit = vi.fn(),
  onForgotPassword = vi.fn(),
  onGoogle = vi.fn(),
  initial = "entrar",
}: {
  onSubmit?: ReturnType<typeof vi.fn>;
  onForgotPassword?: ReturnType<typeof vi.fn>;
  onGoogle?: ReturnType<typeof vi.fn>;
  initial?: AuthMode;
}) {
  const [mode, setMode] = useState<AuthMode>(initial);
  return (
    <AuthFlow
      mode={mode}
      onModeChange={setMode}
      busy={false}
      onGoogle={onGoogle}
      onSubmit={onSubmit}
      onForgotPassword={onForgotPassword}
    />
  );
}

const type = (placeholder: string, value: string) =>
  fireEvent.change(screen.getByPlaceholderText(placeholder), { target: { value } });
const click = (name: RegExp | string) => fireEvent.click(screen.getByRole("button", { name }));

describe("AuthFlow", () => {
  it("só avança com e-mail válido", () => {
    render(<Harness />);
    const next = screen.getByRole("button", { name: "Continuar" });
    expect(next).toBeDisabled();
    type("E-mail", "ana@exemplo.com");
    expect(next).toBeEnabled();
  });

  it("entrar: e-mail → senha → envia as credenciais", () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    type("E-mail", "ana@exemplo.com");
    click("Continuar");

    expect(screen.getByRole("button", { name: "Entrar" })).toBeDisabled(); // senha curta
    type("Senha", "123");
    expect(screen.getByRole("button", { name: "Entrar" })).toBeDisabled();
    type("Senha", "segredo1");
    click("Entrar");

    expect(onSubmit).toHaveBeenCalledWith({
      name: "",
      email: "ana@exemplo.com",
      password: "segredo1",
    });
  });

  it("criar conta: tem um passo extra com o nome", () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} initial="criar" />);
    type("E-mail", "ana@exemplo.com");
    click("Continuar");
    type("Senha", "segredo1");
    click("Continuar");
    type("Seu nome (opcional)", "Ana");
    click("Criar conta");

    expect(onSubmit).toHaveBeenCalledWith({
      name: "Ana",
      email: "ana@exemplo.com",
      password: "segredo1",
    });
  });

  it("o nome é opcional", () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} initial="criar" />);
    type("E-mail", "ana@exemplo.com");
    click("Continuar");
    type("Senha", "segredo1");
    click("Continuar");
    click("Criar conta");
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: "" }));
  });

  it("voltar mantém o que foi digitado", () => {
    render(<Harness />);
    type("E-mail", "ana@exemplo.com");
    click("Continuar");
    click("Voltar");
    expect(screen.getByPlaceholderText("E-mail")).toHaveValue("ana@exemplo.com");
  });

  it("esqueci a senha usa o e-mail já digitado", () => {
    const onForgotPassword = vi.fn();
    render(<Harness onForgotPassword={onForgotPassword} />);
    type("E-mail", "ana@exemplo.com");
    click("Continuar");
    click("Esqueci minha senha");
    expect(onForgotPassword).toHaveBeenCalledWith("ana@exemplo.com");
  });

  it("alternar entre entrar e criar volta ao primeiro passo", () => {
    render(<Harness />);
    type("E-mail", "ana@exemplo.com");
    click("Continuar");
    click("Não tem conta? Criar conta");
    expect(screen.getByPlaceholderText("E-mail")).toHaveValue("ana@exemplo.com");
    expect(screen.getByText("Vamos começar")).toBeInTheDocument();
  });

  it("botão do Google chama onGoogle", () => {
    const onGoogle = vi.fn();
    render(<Harness onGoogle={onGoogle} />);
    click("Continuar com Google");
    expect(onGoogle).toHaveBeenCalled();
  });

  it("mostra e oculta a senha", () => {
    render(<Harness />);
    type("E-mail", "ana@exemplo.com");
    click("Continuar");
    expect(screen.getByPlaceholderText("Senha")).toHaveAttribute("type", "password");
    click("Mostrar senha");
    expect(screen.getByPlaceholderText("Senha")).toHaveAttribute("type", "text");
  });
});
