import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { TopBar } from "@/components/TopBar";
import { useTranslation } from "@/lib/i18n";
import { ScoreBoardTheme } from "@/constants/theme";

export default function TermsScreen() {
  const { locale } = useTranslation();
  const router = useRouter();
  const isPt = locale === "pt";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <TopBar />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Row */}
        <View style={styles.navRow}>
          <TouchableOpacity
            testID="terms-back-btn"
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.75}
            accessibilityLabel={isPt ? "Voltar" : "Back"}
          >
            <Ionicons
              name="arrow-back"
              size={18}
              color={ScoreBoardTheme.onSurface}
            />
          </TouchableOpacity>
          <Text style={styles.navTitle}>
            {isPt ? "Termos & Privacidade" : "Terms & Privacy"}
          </Text>
          <View style={styles.navSpacer} />
        </View>

        {/* Title & Meta */}
        <View style={styles.titleBlock}>
          <Text style={styles.title}>
            {isPt
              ? "Termos & Condições de Utilização"
              : "Terms & Conditions of Service"}
          </Text>
          <Text style={styles.meta}>
            {isPt
              ? "Última atualização: 3 de Novembro de 2026 • Em conformidade com o RGPD (UE 2016/679) e Diretrizes das Lojas de Aplicações."
              : "Last updated: November 3, 2026 • Fully compliant with EU GDPR (2016/679) and App Store Guidelines."}
          </Text>
        </View>

        {/* Legal Body */}
        <View style={styles.card}>
          {/* Section 1 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Text style={styles.sectionNum}>1. </Text>
              {isPt
                ? "Introdução e Aceitação"
                : "Introduction & Acceptance of Terms"}
            </Text>
            <Text style={styles.bodyText}>
              {isPt
                ? "Bem-vindo ao ScoreBoard. Ao aceder, registar uma conta ou utilizar a nossa plataforma web ou aplicações móveis, concorda expressamente em ficar vinculado a estes Termos e Condições, incluindo as nossas políticas de subscrição e de proteção de dados (RGPD). Caso discorde de qualquer termo, deverá cessar a utilização e eliminar a sua conta através da área de definições."
                : "Welcome to ScoreBoard. By accessing, registering an account, or using our web platform or mobile applications, you agree to be bound by these Terms & Conditions, including our Subscription Policies and Data Retention/GDPR commitments. If you do not agree to these terms, you must discontinue using the service and delete your account via the settings dashboard."}
            </Text>
          </View>

          {/* Section 2 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Text style={styles.sectionNum}>2. </Text>
              {isPt ? "Planos e Funcionalidades do Serviço" : "Services & Plans"}
            </Text>
            <Text style={styles.bodyText}>
              {isPt
                ? "O ScoreBoard disponibiliza gestão e acompanhamento de jogos e competições em tempo real para diversas modalidades desportivas (Ténis, Padel, Voleibol, Voleibol de Praia, Basquetebol e Futebol):"
                : "ScoreBoard provides live match scorekeeping, tournament bracket management, referee delegation, and real-time feeds across multiple sports (Tennis, Padel, Volleyball, Beach Volleyball, Basketball, and Football):"}
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bodyText}>
                •{" "}
                <Text style={styles.strongText}>
                  {isPt
                    ? "Plano Gratuito (Comunidade): "
                    : "Community / Free Plan: "}
                </Text>
                {isPt
                  ? "Marcador e acompanhamento ilimitado de partidas amigáveis e individuais, acesso aos marcadores ao vivo com temas visuais de campo, participação como jogador/equipa em torneios e modo offline com sincronização automática."
                  : "Unlimited scorekeeping for friendly and standalone matches, live atmospheric court views, participating in competitions as a player/team, and offline scorekeeping with auto-sync."}
              </Text>
              <Text style={styles.bodyText}>
                •{" "}
                <Text style={styles.strongText}>
                  {isPt
                    ? "Plano Pro Organizador: "
                    : "Pro Organizer Plan: "}
                </Text>
                {isPt
                  ? "Criação ilimitada de torneios (fase de grupos, eliminatórias simples e duplas), atribuição oficial de árbitros, personalização de patrocinadores e logótipos, marcador limpo em tempo real para transmissões em direto (OBS / vMix) e exportação de resultados em PDF/CSV."
                  : "Unlimited tournament creation (Group stages, single/double knockout brackets), referee delegation, sponsor branding, real-time clean broadcast scoreboard overlay for live streams (OBS / vMix), and PDF/CSV standings exports."}
              </Text>
            </View>
          </View>

          {/* Section 3 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Text style={styles.sectionNum}>3. </Text>
              {isPt
                ? "Subscrições, Faturação e Vouchers de Clube"
                : "Subscriptions, Billing & Club Vouchers"}
            </Text>

            <View style={styles.subSection}>
              <Text style={styles.subTitle}>
                {isPt
                  ? "Preçário e Renovação Automática"
                  : "Pricing & Auto-Renewal"}
              </Text>
              <Text style={styles.bodyText}>
                {isPt
                  ? "O Plano Pro Organizador tem o valor de €3.99/mês (faturação mensal) ou €34.99/ano (faturação anual, poupança de ~27%). As subscrições renovam-se automaticamente a menos que sejam canceladas com pelo menos 24 horas de antecedência em relação ao fim do ciclo corrente."
                  : "The Pro Organizer Plan is priced at €3.99/month (monthly billing) or €34.99/year (annual billing, ~27% savings). Subscriptions automatically renew at the end of each billing cycle unless canceled at least 24 hours prior to the renewal date."}
              </Text>
            </View>

            <View style={styles.subSection}>
              <Text style={styles.subTitle}>
                {isPt
                  ? "Processamento de Pagamento"
                  : "Payment Processors & App Stores"}
              </Text>
              <Text style={styles.bodyText}>
                {isPt
                  ? "Os pagamentos na web são processados de forma encriptada através do Stripe, Inc. Nas aplicações móveis (iOS e Android), as compras são processadas através da Apple StoreKit ou Google Play Billing de acordo com os termos de cada plataforma. A ativação numa plataforma desbloqueia o acesso Pro em todos os dispositivos associados à mesma conta."
                  : "Web subscriptions are securely processed by Stripe, Inc. On mobile devices (iOS & Android), purchases are billed through Apple StoreKit or Google Play Billing in compliance with store policies. An active subscription on one platform unlocks Pro features across all devices under the same account."}
              </Text>
            </View>

            <View style={styles.subSection}>
              <Text style={styles.subTitle}>
                {isPt
                  ? "Cancelamento e Política de Reembolso"
                  : "Cancellation & Refund Policy"}
              </Text>
              <Text style={styles.bodyText}>
                {isPt
                  ? "Pode cancelar a sua subscrição a qualquer momento no menu de Definições através do Portal de Clientes Stripe ou nas definições de subscrição do seu dispositivo móvel. Ao cancelar, mantém o acesso total até ao termo do período faturado. Exceto nos termos previstos pelo direito de livre resolução da União Europeia (14 dias prévios ao início da fruição do serviço digital), os pagamentos efetuados não são reembolsáveis."
                  : "You may cancel your subscription at any time via the user Settings Customer Portal or your mobile device subscription manager. Upon cancellation, you retain full access until the end of the current paid period. Except where mandated by EU statutory consumer rights, subscription payments are non-refundable."}
              </Text>
            </View>

            <View style={styles.subSection}>
              <Text style={styles.subTitle}>
                {isPt
                  ? "Vouchers e Códigos Promocionais de Clube"
                  : "Club Beta Vouchers & Promotional Codes"}
              </Text>
              <Text style={styles.bodyText}>
                {isPt
                  ? "Os vouchers distribuídos a clubes e parceiros durante a fase beta (ex: BETA-CLUB-60D) garantem acesso Pro temporário sem necessidade de introduzir dados de cartão de crédito. Os vouchers não têm valor monetário, não podem ser vendidos e cessam no termo do período concedido."
                  : "Promotional vouchers and beta passes distributed to clubs (e.g. BETA-CLUB-60D) grant temporary Pro access with zero credit card required. Vouchers possess no cash value, are non-transferable, and expire automatically at the end of their granted duration."}
              </Text>
            </View>
          </View>

          {/* Section 4 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Text style={styles.sectionNum}>4. </Text>
              {isPt
                ? "Privacidade, Retenção de Dados e RGPD (UE 2016/679)"
                : "Privacy, Data Retention & GDPR (EU 2016/679)"}
            </Text>
            <Text style={styles.bodyText}>
              {isPt
                ? "O ScoreBoard atua como Responsável pelo Tratamento de Dados (Data Controller) e respeita integralmente os princípios da privacidade desde a conceção (Privacy by Design) e por defeito."
                : "ScoreBoard acts as Data Controller and adheres to the principles of privacy by design and by default under European Union Regulation 2016/679."}
            </Text>

            <View style={styles.subSection}>
              <Text style={styles.subTitle}>
                {isPt
                  ? "Dados Recolhidos e Finalidade"
                  : "Collected Data & Purpose"}
              </Text>
              <Text style={styles.bodyText}>
                {isPt
                  ? "Recolhemos o email de registo, identificador de utilizador (username e display name), histórico de pontuações de partidas, preferências de visualização e identificadores anónimos de subscrição. Não armazenamos números de cartões de pagamento nos nossos servidores."
                  : "We collect registration email, unique handles, public display names, match scoring events, viewing preferences, and non-sensitive payment provider IDs. We never store credit card numbers on our servers."}
              </Text>
            </View>

            <View style={styles.subSection}>
              <Text style={styles.subTitle}>
                {isPt
                  ? "Direito ao Esquecimento / Eliminação Permanente (Art. 17 RGPD)"
                  : "Right to Erasure / Account Deletion (Art. 17 GDPR)"}
              </Text>
              <Text style={styles.bodyText}>
                {isPt
                  ? "Qualquer utilizador pode eliminar a sua conta e todos os dados associados a qualquer momento, de forma autónoma, acedendo a Definições → Zona de Perigo e confirmando a ação com o texto 'DELETE'. Esta ação efetua a eliminação irreversível e criptográfica do perfil, credenciais de acesso e notificações do utilizador."
                  : "Users may permanently delete their account and associated data at any time via Settings → Danger Zone by confirming with 'DELETE'. This immediately executes an irreversible cryptographic wipe of user profile, credentials, and notifications."}
              </Text>
            </View>

            <View style={styles.subSection}>
              <Text style={styles.subTitle}>
                {isPt
                  ? "Portabilidade de Dados (Art. 20 RGPD)"
                  : "Data Portability (Art. 20 GDPR)"}
              </Text>
              <Text style={styles.bodyText}>
                {isPt
                  ? "Disponibilizamos uma ferramenta de exportação completa dos seus dados no menu Definições → Segurança, gerando um ficheiro estruturado em formato JSON com todos os registos do utilizador."
                  : "We provide an automated self-service data portability export under Settings → Security & Credentials, generating a structured JSON file containing all user records."}
              </Text>
            </View>
          </View>

          {/* Section 5 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Text style={styles.sectionNum}>5. </Text>
              {isPt
                ? "Responsabilidade pelos Dados Inseridos, Integridade e Denúncia de Ocorrências"
                : "Responsibility for Inserted Data, Integrity & Incident Reporting"}
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bodyText}>
                <Text style={styles.strongText}>
                  {isPt
                    ? "Responsabilidade Exclusiva do Utilizador: "
                    : "Sole User Responsibility: "}
                </Text>
                {isPt
                  ? "Todos os resultados, pontuações, nomes de participantes, equipas, horários e quaisquer outras informações introduzidas na plataforma são da inteira e exclusiva responsabilidade do utilizador, organizador ou árbitro que efetuou a inserção."
                  : "All match results, scores, player/team names, schedules, and any other data entered onto the platform are the sole and exclusive responsibility of the user, organizer, or match official who submitted them."}
              </Text>
              <Text style={styles.bodyText}>
                <Text style={styles.strongText}>
                  {isPt
                    ? "Inexistência de Validação Prévia pela Plataforma: "
                    : "No Prior Verification by the Platform: "}
                </Text>
                {isPt
                  ? "O ScoreBoard funciona como um meio tecnológico de suporte e agregação desportiva e não dispõe de qualquer forma, meio ou obrigação de validar, auditar ou certificar previamente a autenticidade, fidedignidade ou veracidade dos dados inseridos."
                  : "ScoreBoard operates strictly as a digital technology tool and does not possess any means, mechanism, or obligation to verify, audit, or certify the accuracy, authenticity, or truthfulness of any submitted data."}
              </Text>
              <Text style={styles.bodyText}>
                <Text style={styles.strongText}>
                  {isPt
                    ? "Obrigação de Reporte de Ocorrências Não Fidedignas: "
                    : "Reporting Inaccurate or Fraudulent Occurrences: "}
                </Text>
                {isPt
                  ? "Se algum utilizador, participante ou terceiro detetar alguma ocorrência não fidedigna, pontuação fraudulenta, usurpação de identidade ou manipulação de resultados, deve reportar de imediato a ocorrência à plataforma através do email support@scoreboard.app. A plataforma reserva-se o direito de investigar, retificar, ocultar ou remover os dados contestados, bem como suspender ou cancelar as contas infratoras."
                  : "If any user, player, or third party detects an inaccurate record, fraudulent score, identity impersonation, or match manipulation, they must promptly report the incident to support@scoreboard.app. ScoreBoard reserves the right to investigate, correct, hide, or remove contested entries and suspend offending accounts."}
              </Text>
            </View>
          </View>

          {/* Section 6 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Text style={styles.sectionNum}>6. </Text>
              {isPt ? "Lei Aplicável e Contacto" : "Governing Law & Contact"}
            </Text>
            <Text style={styles.bodyText}>
              {isPt
                ? "Estes Termos regem-se pelas leis de Portugal e da União Europeia. Para quaisquer questões, suporte ou exercício de direitos de proteção de dados, contacte-nos:"
                : "These Terms are governed by and construed in accordance with the laws of Portugal and the European Union. For support or privacy inquiries, contact us at:"}
            </Text>
            <View style={styles.contactBox}>
              <Text style={styles.contactLine}>
                Email:{" "}
                <Text style={styles.contactHighlight}>
                  support@scoreboard.app
                </Text>
              </Text>
              <Text style={styles.contactLine}>
                Privacy & Data Protection:{" "}
                <Text style={styles.contactHighlight}>
                  privacy@scoreboard.app
                </Text>
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: ScoreBoardTheme.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 96,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: ScoreBoardTheme.borderSubtle,
    marginBottom: 16,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: ScoreBoardTheme.surfaceContainer,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: ScoreBoardTheme.onSurfaceVariant,
  },
  navSpacer: {
    width: 32,
  },
  titleBlock: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: ScoreBoardTheme.onSurface,
    letterSpacing: -0.4,
  },
  meta: {
    fontSize: 12,
    color: ScoreBoardTheme.textMuted,
    marginTop: 6,
    lineHeight: 17,
  },
  card: {
    backgroundColor: ScoreBoardTheme.surfaceContainer,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    borderRadius: 16,
    padding: 18,
    gap: 22,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: ScoreBoardTheme.onSurface,
  },
  sectionNum: {
    fontFamily: Platform.select({
      ios: "Menlo",
      android: "monospace",
      default: "monospace",
    }),
    color: ScoreBoardTheme.textMuted,
  },
  subSection: {
    marginTop: 4,
    gap: 4,
  },
  subTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: ScoreBoardTheme.onSurface,
  },
  bulletList: {
    gap: 8,
    paddingLeft: 4,
  },
  bodyText: {
    fontSize: 13,
    lineHeight: 20,
    color: ScoreBoardTheme.onSurfaceVariant,
  },
  strongText: {
    fontWeight: "600",
    color: ScoreBoardTheme.onSurface,
  },
  contactBox: {
    marginTop: 4,
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  contactLine: {
    fontFamily: Platform.select({
      ios: "Menlo",
      android: "monospace",
      default: "monospace",
    }),
    fontSize: 11,
    color: ScoreBoardTheme.textMuted,
  },
  contactHighlight: {
    color: ScoreBoardTheme.onSurface,
  },
});
