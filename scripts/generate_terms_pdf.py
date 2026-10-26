import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    PageBreak,
    KeepTogether,
)
from reportlab.pdfgen import canvas
from reportlab.lib import colors

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            super().showPage()
        super().save()

    def draw_page_number(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        footer_text = f"Maia Distribuidora • Termos de Uso e Privacidade • Página {self._pageNumber} de {page_count}"
        self.drawRightString(A4[0] - 54, 36, footer_text)
        self.setStrokeColor(colors.HexColor("#e2e8f0"))
        self.setLineWidth(0.5)
        self.line(54, 48, A4[0] - 54, 48)
        self.restoreState()

def build_pdf(output_path):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=60,
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=15,
        leading=20,
        alignment=1,  # Center
        textColor=colors.HexColor("#0f172a"),
        spaceAfter=18,
    )

    meta_style = ParagraphStyle(
        "MetaStyle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=14,
        textColor=colors.HexColor("#334155"),
        spaceAfter=3,
    )

    meta_bold = ParagraphStyle(
        "MetaBold",
        parent=meta_style,
        fontName="Helvetica-Bold",
    )

    h1_style = ParagraphStyle(
        "SectionHeading",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#1a2a6c"),
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True,
    )

    body_style = ParagraphStyle(
        "BodyDark",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=14,
        alignment=4,  # Justified
        textColor=colors.HexColor("#1e293b"),
        spaceAfter=6,
    )

    subitem_style = ParagraphStyle(
        "SubItem",
        parent=body_style,
        leftIndent=14,
        spaceAfter=3,
    )

    story = []

    # =========================================================================
    # PARTE 1: TERMO DE USO
    # =========================================================================
    story.append(Paragraph("TERMO DE USO DO SISTEMA<br/>“TRIAGEM FILIAL E GERENCIADOR DE ESTOQUE HORTIGRANJEIROS”", title_style))
    story.append(Spacer(1, 10))

    story.append(Paragraph("<b>Titular/Autor:</b> Alexandre Higor C. Q", meta_style))
    story.append(Paragraph("<b>Sistema:</b> TRIAGEM FILIAL E GERENCIADOR DE ESTOQUE HORTIGRANJEIROS", meta_style))
    story.append(Paragraph("<b>Empresa Autorizada a Utilizar:</b> MAIA DISTRIBUIDORA", meta_style))
    story.append(Paragraph("<b>Contato para Notificações:</b> alexandrehigor@outlook.com", meta_style))
    story.append(Spacer(1, 14))

    story.append(Paragraph("1. Objeto", h1_style))
    story.append(Paragraph(
        "1.1. O presente Termo de Uso tem por objeto regular a utilização do sistema denominado “TRIAGEM FILIAL E GERENCIADOR DE ESTOQUE HORTIGRANJEIROS” (doravante denominado “Sistema”), de titularidade exclusiva de Alexandre Higor C. Q, disponibilizado para uso interno e restrito pela empresa MAIA DISTRIBUIDORA.",
        body_style,
    ))

    story.append(Paragraph("2. Titularidade e Direitos Autorais", h1_style))
    story.append(Paragraph(
        "2.1. O Sistema, seu código-fonte, interface, mecânica de funcionamento, documentos técnicos, banco de dados, funcionalidades e quaisquer elementos derivados constituem obra intelectual protegida pelas normas de propriedade intelectual e direitos autorais.",
        body_style,
    ))
    story.append(Paragraph(
        "2.2. O titular não transfere a propriedade do Sistema à empresa MAIA DISTRIBUIDORA, concedendo apenas direito de uso restrito, conforme previsto neste Termo.",
        body_style,
    ))

    story.append(Paragraph("3. Licença de Uso Restrita", h1_style))
    story.append(Paragraph(
        "3.1. A empresa MAIA DISTRIBUIDORA recebe licença não exclusiva, não transferível, não sublicenciável e revogável para uso do Sistema.",
        body_style,
    ))
    story.append(Paragraph(
        "3.2. A licença se aplica exclusivamente para fins internos, operacionais e administrativos da empresa, abrangendo as operações de suas unidades Filial e Matriz.",
        body_style,
    ))

    story.append(Paragraph("4. Restrições", h1_style))
    story.append(Paragraph(
        "4.1. É expressamente proibido à MAIA DISTRIBUIDORA e a qualquer de seus colaboradores, operadores, representantes, filiais ou terceiros ligados à empresa, sem autorização prévia e escrita do titular:",
        body_style,
    ))
    story.append(Paragraph("a) Copiar, total ou parcialmente, o Sistema ou qualquer elemento dele;", subitem_style))
    story.append(Paragraph("b) Modificar, alterar, adaptar, traduzir ou criar obras derivadas;", subitem_style))
    story.append(Paragraph("c) Distribuir, ceder, comercializar, vender, alugar, licenciar ou sublicenciar;", subitem_style))
    story.append(Paragraph("d) Realizar engenharia reversa, desmontagem, compilação inversa ou qualquer tentativa de obtenção do código-fonte;", subitem_style))
    story.append(Paragraph("e) Publicar ou tornar público qualquer conteúdo referente ao Sistema.", subitem_style))
    story.append(Paragraph(
        "4.2. Qualquer violação ao item 4.1 resulta em cancelamento imediato da licença de uso e sujeição às penalidades previstas em lei.",
        body_style,
    ))

    story.append(Paragraph("5. Responsabilidades", h1_style))
    story.append(Paragraph(
        "5.1. O titular não se responsabiliza por uso indevido do Sistema feito por colaboradores da empresa.",
        body_style,
    ))
    story.append(Paragraph(
        "5.2. A empresa é responsável por controlar o acesso interno e impedir que terceiros utilizem o Sistema sem autorização.",
        body_style,
    ))

    story.append(Paragraph("6. Confidencialidade", h1_style))
    story.append(Paragraph(
        "6.1. Todas as informações do Sistema são consideradas confidenciais.",
        body_style,
    ))
    story.append(Paragraph(
        "6.2. A empresa se compromete a não divulgar, repassar ou reproduzir informações técnicas do Sistema para qualquer pessoa física ou jurídica.",
        body_style,
    ))

    story.append(Paragraph("7. Suporte e Atualizações", h1_style))
    story.append(Paragraph(
        "7.1. O suporte técnico e/ou atualizações, quando existentes, serão fornecidos única e exclusivamente pelo titular mediante acordo específico.",
        body_style,
    ))

    story.append(Paragraph("8. Encerramento da Licença", h1_style))
    story.append(Paragraph(
        "8.1. A licença poderá ser revogada pelo titular a qualquer momento, mediante aviso por escrito.",
        body_style,
    ))
    story.append(Paragraph(
        "8.2. Em caso de encerramento, a empresa deve cessar imediatamente o uso e remover o Sistema de seus dispositivos, servidores e acessos internos.",
        body_style,
    ))

    story.append(Paragraph("9. Foro", h1_style))
    story.append(Paragraph(
        "9.1. Para dirimir quaisquer questões decorrentes deste Termo, as partes elegem o foro brasileiro competente, com renúncia de qualquer outro, por mais privilegiado que seja.",
        body_style,
    ))

    # Quebra para a Parte 2
    story.append(PageBreak())

    # =========================================================================
    # PARTE 2: TERMO DE PRIVACIDADE
    # =========================================================================
    story.append(Paragraph("TERMO DE PRIVACIDADE DO SISTEMA<br/>“TRIAGEM FILIAL E GERENCIADOR DE ESTOQUE HORTIGRANJEIROS”", title_style))
    story.append(Spacer(1, 10))

    story.append(Paragraph("<b>Autor/Titular:</b> Alexandre Higor C. Q", meta_style))
    story.append(Paragraph("<b>Sistema:</b> TRIAGEM FILIAL E GERENCIADOR DE ESTOQUE HORTIGRANJEIROS", meta_style))
    story.append(Paragraph("<b>Empresa Autorizada a Utilizar:</b> MAIA DISTRIBUIDORA", meta_style))
    story.append(Paragraph("<b>Contato para Notificações e Privacidade:</b> alexandrehigor@outlook.com", meta_style))
    story.append(Spacer(1, 14))

    story.append(Paragraph("1. Objetivo", h1_style))
    story.append(Paragraph(
        "1.1. O presente Termo de Privacidade tem por objetivo informar a forma como o Sistema TRIAGEM FILIAL E GERENCIADOR DE ESTOQUE HORTIGRANJEIROS coleta, processa, armazena, protege e utiliza dados inseridos pelos usuários autorizados da empresa MAIA DISTRIBUIDORA.",
        body_style,
    ))

    story.append(Paragraph("2. Dados Coletados", h1_style))
    story.append(Paragraph("2.1. O Sistema pode coletar, armazenar e processar os seguintes tipos de dados:", body_style))
    story.append(Paragraph("a) Dados operacionais internos, tais como imagens, registros de ocorrências de perdas, contagens de estoque físico, produtos hortigranjeiros e informações inseridas manualmente pelo usuário;", subitem_style))
    story.append(Paragraph("b) Dados técnicos, como data e hora, logs de auditoria e dados necessários ao funcionamento;", subitem_style))
    story.append(Paragraph("c) Dados de uso, como frequência de acesso e eventos acionados no Sistema.", subitem_style))
    story.append(Paragraph(
        "2.2. Não são coletados dados sensíveis pessoais como documentos civis, endereço, biometria, religião, saúde ou dados financeiros, salvo se inseridos manualmente pela empresa usuária.",
        body_style,
    ))

    story.append(Paragraph("3. Finalidade da Coleta", h1_style))
    story.append(Paragraph("3.1. Os dados coletados têm finalidade estritamente operacional, tais como:", body_style))
    story.append(Paragraph("a) execução do fluxo interno da empresa no recebimento, pesagem e triagem;", subitem_style))
    story.append(Paragraph("b) organização e registro de informações do estoque físico e perdas operacionais;", subitem_style))
    story.append(Paragraph("c) emissão de relatórios de fechamento em PDF e exportação para gestão;", subitem_style))
    story.append(Paragraph("d) controle interno de processos entre a Filial e a Matriz.", subitem_style))
    story.append(Paragraph(
        "3.2. Nenhum dado é utilizado para publicidade, venda, compartilhamento comercial ou criação de perfis externos.",
        body_style,
    ))

    story.append(Paragraph("4. Armazenamento e Segurança", h1_style))
    story.append(Paragraph(
        "4.1. Cabe à empresa MAIA DISTRIBUIDORA definir onde seus dados serão armazenados (dispositivos, infraestrutura de nuvem autorizada, rede interna ou infraestrutura própria).",
        body_style,
    ))
    story.append(Paragraph(
        "4.2. O titular do Sistema não possui acesso automático aos dados gerados pela empresa.",
        body_style,
    ))
    story.append(Paragraph(
        "4.3. A empresa se compromete a manter medidas de proteção de dados, como restrição de acesso, controle de senhas de usuários e procedimentos internos, respeitando a confidencialidade e as diretrizes da Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).",
        body_style,
    ))

    story.append(Paragraph("5. Compartilhamento de Dados", h1_style))
    story.append(Paragraph(
        "5.1. Os dados não são compartilhados com terceiros pelo Sistema.",
        body_style,
    ))
    story.append(Paragraph(
        "5.2. Qualquer compartilhamento só poderá ocorrer mediante consentimento formal da empresa MAIA DISTRIBUIDORA.",
        body_style,
    ))

    story.append(Paragraph("6. Confidencialidade", h1_style))
    story.append(Paragraph(
        "6.1. Todos os dados inseridos no Sistema são considerados confidenciais e pertencem exclusivamente à empresa que os gerou.",
        body_style,
    ))
    story.append(Paragraph(
        "6.2. O titular se compromete a não acessar, divulgar ou solicitar dados da empresa sem acordo formal específico.",
        body_style,
    ))
    story.append(Paragraph(
        "6.3. A empresa compromete-se a não divulgar o funcionamento interno, código-fonte ou estrutura lógica do Sistema, protegidos por propriedade intelectual.",
        body_style,
    ))

    story.append(Paragraph("7. Responsabilidades da Empresa", h1_style))
    story.append(Paragraph("7.1. A empresa é responsável por:", body_style))
    story.append(Paragraph("a) controlar quem tem acesso ao Sistema;", subitem_style))
    story.append(Paragraph("b) manter senhas e acessos seguros;", subitem_style))
    story.append(Paragraph("c) orientar usuários internos sobre uso adequado;", subitem_style))
    story.append(Paragraph("d) remover acessos de ex-colaboradores ou pessoas não autorizadas.", subitem_style))
    story.append(Paragraph(
        "7.2. A empresa assume a responsabilidade pelas informações que insere, sendo proibida a inserção de dados de terceiros sem autorização.",
        body_style,
    ))

    story.append(Paragraph("8. Retenção e Exclusão de Dados", h1_style))
    story.append(Paragraph(
        "8.1. Os dados permanecerão armazenados enquanto forem necessários para fins operacionais da empresa.",
        body_style,
    ))
    story.append(Paragraph(
        "8.2. Caso a empresa decida encerrar o uso do Sistema, deverá exportar ou excluir seus dados, dependendo de sua política interna.",
        body_style,
    ))

    story.append(Paragraph("9. Caução Legal", h1_style))
    story.append(Paragraph(
        "9.1. O titular não se responsabiliza por uso indevido dos dados pela empresa ou por terceiros que obtenham acesso indevido por falhas internas da empresa.",
        body_style,
    ))
    story.append(Paragraph(
        "9.2. Eventual violação de privacidade por terceiros será analisada de acordo com legislação aplicável em território brasileiro.",
        body_style,
    ))

    story.append(Paragraph("10. Alterações no Termo de Privacidade", h1_style))
    story.append(Paragraph(
        "10.1. Alterações neste Termo poderão ser realizadas pelo titular, mediante comunicação à empresa usuária.",
        body_style,
    ))

    story.append(Paragraph("11. Foro", h1_style))
    story.append(Paragraph(
        "11.1. Para fins legais, as partes elegem o foro brasileiro competente para resolver eventuais controvérsias.",
        body_style,
    ))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Sucesso gerando {output_path}")

if __name__ == "__main__":
    cwd = os.getcwd()
    path_root = os.path.join(cwd, "TERMOS DE USO.pdf")
    path_public = os.path.join(cwd, "public", "termos-de-uso.pdf")

    build_pdf(path_root)
    build_pdf(path_public)
