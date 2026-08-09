sed: --: No such file or directory
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      agent_runs: {
        Row: {
          agent_name: string
          attempt: number
          completed_at: string | null
          created_at: string
          duration_ms: number | null
          error_message: string | null
          estimated_cost_eur: number | null
          id: string
          input_tokens: number | null
          items_found: number | null
          model: string | null
          openai_response_id: string | null
          openai_trace_id: string | null
          output_tokens: number | null
          report_run_id: string
          sources_used: number | null
          started_at: string | null
          status: string
          tool_calls: number | null
          updated_at: string
        }
        Insert: {
          agent_name: string
          attempt?: number
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          estimated_cost_eur?: number | null
          id?: string
          input_tokens?: number | null
          items_found?: number | null
          model?: string | null
          openai_response_id?: string | null
          openai_trace_id?: string | null
          output_tokens?: number | null
          report_run_id: string
          sources_used?: number | null
          started_at?: string | null
          status: string
          tool_calls?: number | null
          updated_at?: string
        }
        Update: {
          agent_name?: string
          attempt?: number
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          estimated_cost_eur?: number | null
          id?: string
          input_tokens?: number | null
          items_found?: number | null
          model?: string | null
          openai_response_id?: string | null
          openai_trace_id?: string | null
          output_tokens?: number | null
          report_run_id?: string
          sources_used?: number | null
          started_at?: string | null
          status?: string
          tool_calls?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_runs_report_run_id_fkey"
            columns: ["report_run_id"]
            isOneToOne: false
            referencedRelation: "report_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_initiatives: {
        Row: {
          claimed_benefit: string | null
          created_at: string
          event_id: string | null
          id: string
          last_changed: string | null
          maturity: string
          objective: string
          organisation_id: string
          orientation: string
          realised_benefit_evidence: string
          report_run_id: string
          strategic_relevance: string | null
          technology_partner: string | null
          updated_at: string
          use_case: string
        }
        Insert: {
          claimed_benefit?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          last_changed?: string | null
          maturity: string
          objective: string
          organisation_id: string
          orientation: string
          realised_benefit_evidence: string
          report_run_id: string
          strategic_relevance?: string | null
          technology_partner?: string | null
          updated_at?: string
          use_case: string
        }
        Update: {
          claimed_benefit?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          last_changed?: string | null
          maturity?: string
          objective?: string
          organisation_id?: string
          orientation?: string
          realised_benefit_evidence?: string
          report_run_id?: string
          strategic_relevance?: string | null
          technology_partner?: string | null
          updated_at?: string
          use_case?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_initiatives_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "candidate_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_initiatives_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_initiatives_report_run_id_fkey"
            columns: ["report_run_id"]
            isOneToOne: false
            referencedRelation: "report_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
        }
        Relationships: []
      }
      board_signals: {
        Row: {
          created_at: string
          event_id: string | null
          id: string
          interpretation: string
          rag: string
          report_run_id: string
          score: number
          signal: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          id?: string
          interpretation: string
          rag: string
          report_run_id: string
          score: number
          signal: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string | null
          id?: string
          interpretation?: string
          rag?: string
          report_run_id?: string
          score?: number
          signal?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_signals_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "candidate_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_signals_report_run_id_fkey"
            columns: ["report_run_id"]
            isOneToOne: false
            referencedRelation: "report_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_events: {
        Row: {
          announcement_date: string | null
          created_at: string
          dedupe_key: string
          discovery_agent: string
          event_date: string | null
          evidence_classification: string | null
          evidence_limitations: Json
          exclusion_reason: string | null
          factual_summary: string
          id: string
          included: boolean | null
          potential_irish_relevance: string | null
          report_run_id: string
          sector: string
          source_publication_date: string
          title: string
          updated_at: string
        }
        Insert: {
          announcement_date?: string | null
          created_at?: string
          dedupe_key: string
          discovery_agent: string
          event_date?: string | null
          evidence_classification?: string | null
          evidence_limitations?: Json
          exclusion_reason?: string | null
          factual_summary: string
          id?: string
          included?: boolean | null
          potential_irish_relevance?: string | null
          report_run_id: string
          sector: string
          source_publication_date: string
          title: string
          updated_at?: string
        }
        Update: {
          announcement_date?: string | null
          created_at?: string
          dedupe_key?: string
          discovery_agent?: string
          event_date?: string | null
          evidence_classification?: string | null
          evidence_limitations?: Json
          exclusion_reason?: string | null
          factual_summary?: string
          id?: string
          included?: boolean | null
          potential_irish_relevance?: string | null
          report_run_id?: string
          sector?: string
          source_publication_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_events_report_run_id_fkey"
            columns: ["report_run_id"]
            isOneToOne: false
            referencedRelation: "report_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_updates: {
        Row: {
          commercial_implication: string | null
          created_at: string
          customer_implication: string | null
          event_id: string
          id: string
          maturity: string | null
          organisation_id: string
          report_run_id: string
          strategic_theme: string | null
          updated_at: string
        }
        Insert: {
          commercial_implication?: string | null
          created_at?: string
          customer_implication?: string | null
          event_id: string
          id?: string
          maturity?: string | null
          organisation_id: string
          report_run_id: string
          strategic_theme?: string | null
          updated_at?: string
        }
        Update: {
          commercial_implication?: string | null
          created_at?: string
          customer_implication?: string | null
          event_id?: string
          id?: string
          maturity?: string | null
          organisation_id?: string
          report_run_id?: string
          strategic_theme?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitor_updates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "candidate_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitor_updates_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitor_updates_report_run_id_fkey"
            columns: ["report_run_id"]
            isOneToOne: false
            referencedRelation: "report_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      covering_emails: {
        Row: {
          body: string
          created_at: string
          generated_at: string
          id: string
          report_run_id: string
          subject: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          generated_at?: string
          id?: string
          report_run_id: string
          subject: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          generated_at?: string
          id?: string
          report_run_id?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "covering_emails_report_run_id_fkey"
            columns: ["report_run_id"]
            isOneToOne: true
            referencedRelation: "report_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_signals: {
        Row: {
          classification: string
          created_at: string
          event_id: string | null
          id: string
          limitations: string | null
          market: string | null
          methodology: string | null
          report_run_id: string
          sample_size: number | null
          signal: string
          source_id: string | null
          updated_at: string
        }
        Insert: {
          classification: string
          created_at?: string
          event_id?: string | null
          id?: string
          limitations?: string | null
          market?: string | null
          methodology?: string | null
          report_run_id: string
          sample_size?: number | null
          signal: string
          source_id?: string | null
          updated_at?: string
        }
        Update: {
          classification?: string
          created_at?: string
          event_id?: string | null
          id?: string
          limitations?: string | null
          market?: string | null
          methodology?: string | null
          report_run_id?: string
          sample_size?: number | null
          signal?: string
          source_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_signals_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "candidate_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_signals_report_run_id_fkey"
            columns: ["report_run_id"]
            isOneToOne: false
            referencedRelation: "report_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_signals_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_benchmarks: {
        Row: {
          assessment: string | null
          category: string
          commercial_impact: number | null
          created_at: string
          customer_value: number | null
          event_id: string | null
          evidence: number | null
          id: string
          ireland_relevance: number | null
          maturity: number | null
          organisation_id: string | null
          report_run_id: string
          updated_at: string
        }
        Insert: {
          assessment?: string | null
          category: string
          commercial_impact?: number | null
          created_at?: string
          customer_value?: number | null
          event_id?: string | null
          evidence?: number | null
          id?: string
          ireland_relevance?: number | null
          maturity?: number | null
          organisation_id?: string | null
          report_run_id: string
          updated_at?: string
        }
        Update: {
          assessment?: string | null
          category?: string
          commercial_impact?: number | null
          created_at?: string
          customer_value?: number | null
          event_id?: string | null
          evidence?: number | null
          id?: string
          ireland_relevance?: number | null
          maturity?: number | null
          organisation_id?: string | null
          report_run_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_benchmarks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "candidate_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_benchmarks_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_benchmarks_report_run_id_fkey"
            columns: ["report_run_id"]
            isOneToOne: false
            referencedRelation: "report_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      event_organisations: {
        Row: {
          event_id: string
          organisation_id: string
        }
        Insert: {
          event_id: string
          organisation_id: string
        }
        Update: {
          event_id?: string
          organisation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_organisations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "candidate_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_organisations_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_sources: {
        Row: {
          claim: string | null
          event_id: string
          source_id: string
          supports_claim: boolean
        }
        Insert: {
          claim?: string | null
          event_id: string
          source_id: string
          supports_claim?: boolean
        }
        Update: {
          claim?: string | null
          event_id?: string
          source_id?: string
          supports_claim?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "event_sources_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "candidate_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_sources_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      leadership_decisions: {
        Row: {
          consequence_of_delay: string
          created_at: string
          decision: string
          id: string
          position: number
          recommended_owner: string | null
          recommended_timing: string | null
          report_run_id: string
          updated_at: string
          why_now: string
        }
        Insert: {
          consequence_of_delay: string
          created_at?: string
          decision: string
          id?: string
          position: number
          recommended_owner?: string | null
          recommended_timing?: string | null
          report_run_id: string
          updated_at?: string
          why_now: string
        }
        Update: {
          consequence_of_delay?: string
          created_at?: string
          decision?: string
          id?: string
          position?: number
          recommended_owner?: string | null
          recommended_timing?: string | null
          report_run_id?: string
          updated_at?: string
          why_now?: string
        }
        Relationships: [
          {
            foreignKeyName: "leadership_decisions_report_run_id_fkey"
            columns: ["report_run_id"]
            isOneToOne: false
            referencedRelation: "report_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      materiality_scores: {
        Row: {
          classification:
            | Database["public"]["Enums"]["materiality_class"]
            | null
          commercial_impact: number
          created_at: string
          customer_impact: number
          event_id: string
          id: string
          immediacy: number
          ireland_competitive_relevance: number
          rationale: string
          regulatory_risk_impact: number
          report_run_id: string
          strategic_significance: number
          total: number | null
          updated_at: string
        }
        Insert: {
          classification?:
            | Database["public"]["Enums"]["materiality_class"]
            | null
          commercial_impact: number
          created_at?: string
          customer_impact: number
          event_id: string
          id?: string
          immediacy: number
          ireland_competitive_relevance: number
          rationale: string
          regulatory_risk_impact: number
          report_run_id: string
          strategic_significance: number
          total?: number | null
          updated_at?: string
        }
        Update: {
          classification?:
            | Database["public"]["Enums"]["materiality_class"]
            | null
          commercial_impact?: number
          created_at?: string
          customer_impact?: number
          event_id?: string
          id?: string
          immediacy?: number
          ireland_competitive_relevance?: number
          rationale?: string
          regulatory_risk_impact?: number
          report_run_id?: string
          strategic_significance?: number
          total?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "materiality_scores_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "candidate_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materiality_scores_report_run_id_fkey"
            columns: ["report_run_id"]
            isOneToOne: false
            referencedRelation: "report_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          read_at: string | null
          report_run_id: string | null
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          report_run_id?: string | null
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          report_run_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_report_run_id_fkey"
            columns: ["report_run_id"]
            isOneToOne: false
            referencedRelation: "report_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      organisation_aliases: {
        Row: {
          alias: string
          created_at: string
          id: string
          organisation_id: string
          updated_at: string
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          alias: string
          created_at?: string
          id?: string
          organisation_id: string
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          alias?: string
          created_at?: string
          id?: string
          organisation_id?: string
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organisation_aliases_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      organisation_relationships: {
        Row: {
          announced_at: string | null
          created_at: string
          effective_from: string | null
          effective_to: string | null
          from_organisation_id: string
          id: string
          relationship_type: string
          source_id: string | null
          status: string
          to_organisation_id: string
          updated_at: string
        }
        Insert: {
          announced_at?: string | null
          created_at?: string
          effective_from?: string | null
          effective_to?: string | null
          from_organisation_id: string
          id?: string
          relationship_type: string
          source_id?: string | null
          status?: string
          to_organisation_id: string
          updated_at?: string
        }
        Update: {
          announced_at?: string | null
          created_at?: string
          effective_from?: string | null
          effective_to?: string | null
          from_organisation_id?: string
          id?: string
          relationship_type?: string
          source_id?: string | null
          status?: string
          to_organisation_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organisation_relationship_source_fk"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organisation_relationships_from_organisation_id_fkey"
            columns: ["from_organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organisation_relationships_to_organisation_id_fkey"
            columns: ["to_organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      organisations: {
        Row: {
          active: boolean
          created_at: string
          current_owner_id: string | null
          id: string
          is_irish: boolean
          jurisdiction: string | null
          legal_name: string | null
          metadata: Json
          name: string
          organisation_type: string | null
          sector: string
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          current_owner_id?: string | null
          id?: string
          is_irish?: boolean
          jurisdiction?: string | null
          legal_name?: string | null
          metadata?: Json
          name: string
          organisation_type?: string | null
          sector: string
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          current_owner_id?: string | null
          id?: string
          is_irish?: boolean
          jurisdiction?: string | null
          legal_name?: string | null
          metadata?: Json
          name?: string
          organisation_type?: string | null
          sector?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organisations_current_owner_id_fkey"
            columns: ["current_owner_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      ownership_events: {
        Row: {
          announced_at: string | null
          buyer_id: string | null
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          source_id: string | null
          status: string
          target_id: string
          updated_at: string
        }
        Insert: {
          announced_at?: string | null
          buyer_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          source_id?: string | null
          status: string
          target_id: string
          updated_at?: string
        }
        Update: {
          announced_at?: string | null
          buyer_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          source_id?: string | null
          status?: string
          target_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ownership_event_source_fk"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ownership_events_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ownership_events_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      regulatory_items: {
        Row: {
          affected_firms: string | null
          announcement_date: string | null
          business_impact: string | null
          created_at: string
          customer_impact: string | null
          data_implications: string | null
          digital_implications: string | null
          effective_date: string | null
          event_id: string | null
          governance_implications: string | null
          id: string
          report_run_id: string
          required_response: string | null
          status: string
          title: string
          updated_at: string
          urgency: string | null
        }
        Insert: {
          affected_firms?: string | null
          announcement_date?: string | null
          business_impact?: string | null
          created_at?: string
          customer_impact?: string | null
          data_implications?: string | null
          digital_implications?: string | null
          effective_date?: string | null
          event_id?: string | null
          governance_implications?: string | null
          id?: string
          report_run_id: string
          required_response?: string | null
          status: string
          title: string
          updated_at?: string
          urgency?: string | null
        }
        Update: {
          affected_firms?: string | null
          announcement_date?: string | null
          business_impact?: string | null
          created_at?: string
          customer_impact?: string | null
          data_implications?: string | null
          digital_implications?: string | null
          effective_date?: string | null
          event_id?: string | null
          governance_implications?: string | null
          id?: string
          report_run_id?: string
          required_response?: string | null
          status?: string
          title?: string
          updated_at?: string
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "regulatory_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "candidate_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regulatory_items_report_run_id_fkey"
            columns: ["report_run_id"]
            isOneToOne: false
            referencedRelation: "report_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      report_run_status_history: {
        Row: {
          created_at: string
          detail: string | null
          id: string
          report_run_id: string
          status: Database["public"]["Enums"]["report_run_status"]
        }
        Insert: {
          created_at?: string
          detail?: string | null
          id?: string
          report_run_id: string
          status: Database["public"]["Enums"]["report_run_status"]
        }
        Update: {
          created_at?: string
          detail?: string | null
          id?: string
          report_run_id?: string
          status?: Database["public"]["Enums"]["report_run_status"]
        }
        Relationships: [
          {
            foreignKeyName: "report_run_status_history_report_run_id_fkey"
            columns: ["report_run_id"]
            isOneToOne: false
            referencedRelation: "report_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      report_runs: {
        Row: {
          actual_cost_eur: number | null
          approval_token: string | null
          approved_at: string | null
          approved_by: string | null
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          is_rerun: boolean
          period_end: string
          period_start: string
          projected_cost_eur: number | null
          report_date: string
          started_at: string | null
          status: Database["public"]["Enums"]["report_run_status"]
          timezone: string
          updated_at: string
          version: number
          workflow_run_id: string | null
        }
        Insert: {
          actual_cost_eur?: number | null
          approval_token?: string | null
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          is_rerun?: boolean
          period_end: string
          period_start: string
          projected_cost_eur?: number | null
          report_date: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["report_run_status"]
          timezone?: string
          updated_at?: string
          version?: number
          workflow_run_id?: string | null
        }
        Update: {
          actual_cost_eur?: number | null
          approval_token?: string | null
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          is_rerun?: boolean
          period_end?: string
          period_start?: string
          projected_cost_eur?: number | null
          report_date?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["report_run_status"]
          timezone?: string
          updated_at?: string
          version?: number
          workflow_run_id?: string | null
        }
        Relationships: []
      }
      report_sections: {
        Row: {
          content: Json
          created_at: string
          id: string
          position: number
          report_id: string
          section_key: string
          updated_at: string
        }
        Insert: {
          content: Json
          created_at?: string
          id?: string
          position: number
          report_id: string
          section_key: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          position?: number
          report_id?: string
          section_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_sections_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          content: Json
          created_at: string
          executive_headline: string
          id: string
          is_published: boolean
          overall_assessment: string
          published_at: string | null
          report_run_id: string
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          content: Json
          created_at?: string
          executive_headline: string
          id?: string
          is_published?: boolean
          overall_assessment: string
          published_at?: string | null
          report_run_id: string
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          executive_headline?: string
          id?: string
          is_published?: boolean
          overall_assessment?: string
          published_at?: string | null
          report_run_id?: string
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_report_run_id_fkey"
            columns: ["report_run_id"]
            isOneToOne: true
            referencedRelation: "report_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      research_questions: {
        Row: {
          created_at: string
          id: string
          priority: number
          question: string
          report_run_id: string
          resolved_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          priority?: number
          question: string
          report_run_id: string
          resolved_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          priority?: number
          question?: string
          report_run_id?: string
          resolved_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_questions_report_run_id_fkey"
            columns: ["report_run_id"]
            isOneToOne: false
            referencedRelation: "report_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      sources: {
        Row: {
          accessed_at: string
          approved_public: boolean
          canonical_url: string
          created_at: string
          credibility_tier: number
          evidence_classification: string | null
          id: string
          notes: string | null
          primary_source: boolean
          publication_date: string | null
          publisher: string
          source_type: string
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          accessed_at?: string
          approved_public?: boolean
          canonical_url: string
          created_at?: string
          credibility_tier: number
          evidence_classification?: string | null
          id?: string
          notes?: string | null
          primary_source?: boolean
          publication_date?: string | null
          publisher: string
          source_type: string
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          accessed_at?: string
          approved_public?: boolean
          canonical_url?: string
          created_at?: string
          credibility_tier?: number
          evidence_classification?: string | null
          id?: string
          notes?: string | null
          primary_source?: boolean
          publication_date?: string | null
          publisher?: string
          source_type?: string
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      strategic_recommendations: {
        Row: {
          action: string
          category: string
          confidence: string
          created_at: string
          expected_business_outcome: string
          expected_customer_outcome: string
          first_action: string
          id: string
          priority: number
          report_run_id: string
          supporting_signal: string
          updated_at: string
          urgency: string
        }
        Insert: {
          action: string
          category: string
          confidence: string
          created_at?: string
          expected_business_outcome: string
          expected_customer_outcome: string
          first_action: string
          id?: string
          priority: number
          report_run_id: string
          supporting_signal: string
          updated_at?: string
          urgency: string
        }
        Update: {
          action?: string
          category?: string
          confidence?: string
          created_at?: string
          expected_business_outcome?: string
          expected_customer_outcome?: string
          first_action?: string
          id?: string
          priority?: number
          report_run_id?: string
          supporting_signal?: string
          updated_at?: string
          urgency?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategic_recommendations_report_run_id_fkey"
            columns: ["report_run_id"]
            isOneToOne: false
            referencedRelation: "report_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      strategic_themes: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      theme_assessments: {
        Row: {
          change_from_previous_report: string | null
          created_at: string
          current_assessment: string
          direction: string
          evidence_strength: string
          id: string
          ireland_implication: string
          likely_12_month_effect: string | null
          likely_24_month_effect: string | null
          previous_assessment: string | null
          report_run_id: string
          theme_id: string
          updated_at: string
        }
        Insert: {
          change_from_previous_report?: string | null
          created_at?: string
          current_assessment: string
          direction: string
          evidence_strength: string
          id?: string
          ireland_implication: string
          likely_12_month_effect?: string | null
          likely_24_month_effect?: string | null
          previous_assessment?: string | null
          report_run_id: string
          theme_id: string
          updated_at?: string
        }
        Update: {
          change_from_previous_report?: string | null
          created_at?: string
          current_assessment?: string
          direction?: string
          evidence_strength?: string
          id?: string
          ireland_implication?: string
          likely_12_month_effect?: string | null
          likely_24_month_effect?: string | null
          previous_assessment?: string | null
          report_run_id?: string
          theme_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "theme_assessments_report_run_id_fkey"
            columns: ["report_run_id"]
            isOneToOne: false
            referencedRelation: "report_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "theme_assessments_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "strategic_themes"
            referencedColumns: ["id"]
          },
        ]
      }
      theme_events: {
        Row: {
          event_id: string
          theme_id: string
        }
        Insert: {
          event_id: string
          theme_id: string
        }
        Update: {
          event_id?: string
          theme_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "theme_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "candidate_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "theme_events_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "strategic_themes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_feedback: {
        Row: {
          comment: string | null
          created_at: string
          event_id: string | null
          feedback_type: string
          id: string
          report_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          event_id?: string | null
          feedback_type: string
          id?: string
          report_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          event_id?: string | null
          feedback_type?: string
          id?: string
          report_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_feedback_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "candidate_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_feedback_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      watchlist_items: {
        Row: {
          carried_from_id: string | null
          created_at: string
          id: string
          report_run_id: string
          resolution: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          carried_from_id?: string | null
          created_at?: string
          id?: string
          report_run_id: string
          resolution?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          carried_from_id?: string | null
          created_at?: string
          id?: string
          report_run_id?: string
          resolution?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "watchlist_items_carried_from_id_fkey"
            columns: ["carried_from_id"]
            isOneToOne: false
            referencedRelation: "watchlist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watchlist_items_report_run_id_fkey"
            columns: ["report_run_id"]
            isOneToOne: false
            referencedRelation: "report_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_steps: {
        Row: {
          agent_run_id: string | null
          attempt: number
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          input_hash: string | null
          output: Json | null
          report_run_id: string
          started_at: string | null
          status: string
          step_key: string
          updated_at: string
        }
        Insert: {
          agent_run_id?: string | null
          attempt?: number
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          input_hash?: string | null
          output?: Json | null
          report_run_id: string
          started_at?: string | null
          status: string
          step_key: string
          updated_at?: string
        }
        Update: {
          agent_run_id?: string | null
          attempt?: number
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          input_hash?: string | null
          output?: Json | null
          report_run_id?: string
          started_at?: string | null
          status?: string
          step_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_steps_agent_run_id_fkey"
            columns: ["agent_run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_steps_report_run_id_fkey"
            columns: ["report_run_id"]
            isOneToOne: false
            referencedRelation: "report_runs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "public" | "admin"
      materiality_class: "critical" | "significant" | "watchlist" | "exclude"
      report_run_status:
        | "queued"
        | "discovering"
        | "verifying"
        | "scoring"
        | "analysing"
        | "synthesising"
        | "quality_check"
        | "awaiting_approval"
        | "publishing"
        | "completed"
        | "failed"
        | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["public", "admin"],
      materiality_class: ["critical", "significant", "watchlist", "exclude"],
      report_run_status: [
        "queued",
        "discovering",
        "verifying",
        "scoring",
        "analysing",
        "synthesising",
        "quality_check",
        "awaiting_approval",
        "publishing",
        "completed",
        "failed",
        "cancelled",
      ],
    },
  },
} as const

