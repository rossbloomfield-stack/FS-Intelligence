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
    PostgrestVersion: "14.5"
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
      buyer_candidates: {
        Row: {
          active: boolean
          buyer_category: string
          buyer_name: string
          confidence: string
          created_at: string
          domain_id: string
          evidence_checked_at: string | null
          evidence_level: string
          first_discovered_at: string
          id: string
          last_confirmed_at: string
          manual_review_required: boolean
          normalized_website: string
          outreach_eligible: boolean
          rationale: string
          relevance_score: number
          rights_holder_risk: boolean
          source: string
          source_url: string
          updated_at: string
          website: string
        }
        Insert: {
          active?: boolean
          buyer_category: string
          buyer_name: string
          confidence: string
          created_at?: string
          domain_id: string
          evidence_checked_at?: string | null
          evidence_level: string
          first_discovered_at: string
          id?: string
          last_confirmed_at: string
          manual_review_required?: boolean
          normalized_website: string
          outreach_eligible?: boolean
          rationale: string
          relevance_score: number
          rights_holder_risk?: boolean
          source: string
          source_url: string
          updated_at?: string
          website: string
        }
        Update: {
          active?: boolean
          buyer_category?: string
          buyer_name?: string
          confidence?: string
          created_at?: string
          domain_id?: string
          evidence_checked_at?: string | null
          evidence_level?: string
          first_discovered_at?: string
          id?: string
          last_confirmed_at?: string
          manual_review_required?: boolean
          normalized_website?: string
          outreach_eligible?: boolean
          rationale?: string
          relevance_score?: number
          rights_holder_risk?: boolean
          source?: string
          source_url?: string
          updated_at?: string
          website?: string
        }
        Relationships: [
          {
            foreignKeyName: "buyer_candidates_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
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
      company_financial_metrics: {
        Row: {
          approved: boolean
          created_at: string
          id: string
          metric: string
          notes: string | null
          organisation_id: string
          period_end: string
          period_start: string | null
          reported_at: string
          source_id: string
          unit: string
          updated_at: string
          value: number
        }
        Insert: {
          approved?: boolean
          created_at?: string
          id?: string
          metric: string
          notes?: string | null
          organisation_id: string
          period_end: string
          period_start?: string | null
          reported_at: string
          source_id: string
          unit: string
          updated_at?: string
          value: number
        }
        Update: {
          approved?: boolean
          created_at?: string
          id?: string
          metric?: string
          notes?: string | null
          organisation_id?: string
          period_end?: string
          period_start?: string | null
          reported_at?: string
          source_id?: string
          unit?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "company_financial_metrics_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_financial_metrics_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      company_strategy_profile_sources: {
        Row: {
          claim_supported: string
          profile_id: string
          source_id: string
          support_strength: string
        }
        Insert: {
          claim_supported: string
          profile_id: string
          source_id: string
          support_strength: string
        }
        Update: {
          claim_supported?: string
          profile_id?: string
          source_id?: string
          support_strength?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_strategy_profile_sources_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "company_strategy_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_strategy_profile_sources_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      company_strategy_profiles: {
        Row: {
          acquisition_strategy: string[]
          ai_strategy: string[]
          approved: boolean
          confidence: Database["public"]["Enums"]["intelligence_confidence"]
          cost_priorities: string[]
          created_at: string
          customer_strategy: string[]
          digital_strategy: string[]
          distribution_strategy: string[]
          effective_at: string
          growth_priorities: string[]
          id: string
          key_risks: string[]
          organisation_id: string
          previous_profile_id: string | null
          product_strategy: string[]
          strategic_priorities: string[]
          strategy_summary: string
          technology_priorities: string[]
          updated_at: string
        }
        Insert: {
          acquisition_strategy?: string[]
          ai_strategy?: string[]
          approved?: boolean
          confidence?: Database["public"]["Enums"]["intelligence_confidence"]
          cost_priorities?: string[]
          created_at?: string
          customer_strategy?: string[]
          digital_strategy?: string[]
          distribution_strategy?: string[]
          effective_at: string
          growth_priorities?: string[]
          id?: string
          key_risks?: string[]
          organisation_id: string
          previous_profile_id?: string | null
          product_strategy?: string[]
          strategic_priorities?: string[]
          strategy_summary: string
          technology_priorities?: string[]
          updated_at?: string
        }
        Update: {
          acquisition_strategy?: string[]
          ai_strategy?: string[]
          approved?: boolean
          confidence?: Database["public"]["Enums"]["intelligence_confidence"]
          cost_priorities?: string[]
          created_at?: string
          customer_strategy?: string[]
          digital_strategy?: string[]
          distribution_strategy?: string[]
          effective_at?: string
          growth_priorities?: string[]
          id?: string
          key_risks?: string[]
          organisation_id?: string
          previous_profile_id?: string | null
          product_strategy?: string[]
          strategic_priorities?: string[]
          strategy_summary?: string
          technology_priorities?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_strategy_profiles_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_strategy_profiles_previous_profile_id_fkey"
            columns: ["previous_profile_id"]
            isOneToOne: false
            referencedRelation: "company_strategy_profiles"
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
      conversation_claims: {
        Row: {
          claim_text: string
          conversation_id: string
          created_at: string
          id: string
          message_id: string
          reference_ids: string[]
          support_strength: string
          user_id: string
        }
        Insert: {
          claim_text: string
          conversation_id: string
          created_at?: string
          id?: string
          message_id: string
          reference_ids?: string[]
          support_strength: string
          user_id: string
        }
        Update: {
          claim_text?: string
          conversation_id?: string
          created_at?: string
          id?: string
          message_id?: string
          reference_ids?: string[]
          support_strength?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_claims_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_claims_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "conversation_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_entities: {
        Row: {
          conversation_id: string
          created_at: string
          entity_id: string
          entity_label: string
          entity_type: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          entity_id: string
          entity_label: string
          entity_type: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          entity_id?: string
          entity_label?: string
          entity_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_entities_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_feedback: {
        Row: {
          conversation_id: string
          created_at: string
          helpful: boolean
          id: string
          message_id: string
          note: string | null
          reason: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          helpful: boolean
          id?: string
          message_id: string
          note?: string | null
          reason?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          helpful?: boolean
          id?: string
          message_id?: string
          note?: string | null
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_feedback_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_feedback_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "conversation_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_messages: {
        Row: {
          confidence: string | null
          content: Json
          conversation_id: string
          created_at: string
          freshness: string | null
          id: string
          intent: string | null
          latency_ms: number | null
          role: string
          user_id: string
        }
        Insert: {
          confidence?: string | null
          content: Json
          conversation_id: string
          created_at?: string
          freshness?: string | null
          id?: string
          intent?: string | null
          latency_ms?: number | null
          role: string
          user_id: string
        }
        Update: {
          confidence?: string | null
          content?: Json
          conversation_id?: string
          created_at?: string
          freshness?: string | null
          id?: string
          intent?: string | null
          latency_ms?: number | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_references: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          message_id: string
          rank: number
          reference_snapshot: Json
          source_id: string | null
          support_strength: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          message_id: string
          rank: number
          reference_snapshot: Json
          source_id?: string | null
          support_strength: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          message_id?: string
          rank?: number
          reference_snapshot?: Json
          source_id?: string | null
          support_strength?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_references_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_references_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "conversation_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_references_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          context: Json
          created_at: string
          id: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          context?: Json
          created_at?: string
          id?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          context?: Json
          created_at?: string
          id?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          evidence_type: string | null
          id: string
          limitations: string | null
          market: string | null
          methodology: string | null
          report_run_id: string
          sample_size: number | null
          signal: string
          source_id: string | null
          survey_date: string | null
          updated_at: string
        }
        Insert: {
          classification: string
          created_at?: string
          event_id?: string | null
          evidence_type?: string | null
          id?: string
          limitations?: string | null
          market?: string | null
          methodology?: string | null
          report_run_id: string
          sample_size?: number | null
          signal: string
          source_id?: string | null
          survey_date?: string | null
          updated_at?: string
        }
        Update: {
          classification?: string
          created_at?: string
          event_id?: string | null
          evidence_type?: string | null
          id?: string
          limitations?: string | null
          market?: string | null
          methodology?: string | null
          report_run_id?: string
          sample_size?: number | null
          signal?: string
          source_id?: string | null
          survey_date?: string | null
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
      digital_capabilities: {
        Row: {
          approved: boolean
          assessment: string | null
          capability: string
          created_at: string
          id: string
          last_verified_at: string
          maturity: number | null
          organisation_id: string
          source_id: string
          status: Database["public"]["Enums"]["capability_status"]
          updated_at: string
        }
        Insert: {
          approved?: boolean
          assessment?: string | null
          capability: string
          created_at?: string
          id?: string
          last_verified_at: string
          maturity?: number | null
          organisation_id: string
          source_id: string
          status: Database["public"]["Enums"]["capability_status"]
          updated_at?: string
        }
        Update: {
          approved?: boolean
          assessment?: string | null
          capability?: string
          created_at?: string
          id?: string
          last_verified_at?: string
          maturity?: number | null
          organisation_id?: string
          source_id?: string
          status?: Database["public"]["Enums"]["capability_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_capabilities_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_capabilities_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      domain_observations: {
        Row: {
          asking_price: number | null
          availability_status: string | null
          buyer_demand: Json | null
          changed_fields: string[]
          domain_id: string
          event_type: string
          evidence_level: string
          metrics_hash: string | null
          observed_at: string
          on_deleted_list: boolean
          opportunity_score: number | null
          previous_on_deleted_list: boolean | null
          renewal_cost: number | null
          run_id: string
          seo_metrics: Json | null
          snapshot: Json
          valuation: Json | null
        }
        Insert: {
          asking_price?: number | null
          availability_status?: string | null
          buyer_demand?: Json | null
          changed_fields?: string[]
          domain_id: string
          event_type?: string
          evidence_level?: string
          metrics_hash?: string | null
          observed_at: string
          on_deleted_list?: boolean
          opportunity_score?: number | null
          previous_on_deleted_list?: boolean | null
          renewal_cost?: number | null
          run_id: string
          seo_metrics?: Json | null
          snapshot?: Json
          valuation?: Json | null
        }
        Update: {
          asking_price?: number | null
          availability_status?: string | null
          buyer_demand?: Json | null
          changed_fields?: string[]
          domain_id?: string
          event_type?: string
          evidence_level?: string
          metrics_hash?: string | null
          observed_at?: string
          on_deleted_list?: boolean
          opportunity_score?: number | null
          previous_on_deleted_list?: boolean | null
          renewal_cost?: number | null
          run_id?: string
          seo_metrics?: Json | null
          snapshot?: Json
          valuation?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "domain_observations_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "domain_observations_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ingestion_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      domains: {
        Row: {
          contains_hyphen: boolean
          contains_number: boolean
          created_at: string
          current_on_deleted_list: boolean
          domain: string
          first_availability_observed_at: string | null
          first_seen_at: string
          hidden: boolean
          id: string
          last_seen_at: string
          latest_asking_price: number | null
          latest_availability_status: string | null
          latest_buyer_demand: Json | null
          latest_ingestion_run_id: string | null
          latest_opportunity_score: number | null
          latest_renewal_cost: number | null
          latest_seo_metrics: Json | null
          latest_valuation: Json | null
          length: number
          opportunity_classification: string | null
          opportunity_concerns: string[]
          opportunity_evidence_completeness: number | null
          opportunity_evidence_level: string | null
          opportunity_reasons: string[]
          opportunity_risk_adjustment: number
          opportunity_score_breakdown: Json
          opportunity_scored_at: string | null
          opportunity_scoring_version: string | null
          preliminary_assessed_at: string | null
          preliminary_breakdown: Json
          preliminary_concerns: string[]
          preliminary_eligible: boolean
          preliminary_filter_version: string | null
          preliminary_reasons: string[]
          preliminary_score: number | null
          removed_from_list_at: string | null
          seo_enriched_at: string | null
          seo_evidence_level: string | null
          seo_provider: string | null
          sld: string
          source_url: string
          tld: string
          updated_at: string
          valuation_version: string | null
          valued_at: string | null
          word_count: number
        }
        Insert: {
          contains_hyphen?: boolean
          contains_number?: boolean
          created_at?: string
          current_on_deleted_list?: boolean
          domain: string
          first_availability_observed_at?: string | null
          first_seen_at: string
          hidden?: boolean
          id?: string
          last_seen_at: string
          latest_asking_price?: number | null
          latest_availability_status?: string | null
          latest_buyer_demand?: Json | null
          latest_ingestion_run_id?: string | null
          latest_opportunity_score?: number | null
          latest_renewal_cost?: number | null
          latest_seo_metrics?: Json | null
          latest_valuation?: Json | null
          length: number
          opportunity_classification?: string | null
          opportunity_concerns?: string[]
          opportunity_evidence_completeness?: number | null
          opportunity_evidence_level?: string | null
          opportunity_reasons?: string[]
          opportunity_risk_adjustment?: number
          opportunity_score_breakdown?: Json
          opportunity_scored_at?: string | null
          opportunity_scoring_version?: string | null
          preliminary_assessed_at?: string | null
          preliminary_breakdown?: Json
          preliminary_concerns?: string[]
          preliminary_eligible?: boolean
          preliminary_filter_version?: string | null
          preliminary_reasons?: string[]
          preliminary_score?: number | null
          removed_from_list_at?: string | null
          seo_enriched_at?: string | null
          seo_evidence_level?: string | null
          seo_provider?: string | null
          sld: string
          source_url: string
          tld?: string
          updated_at?: string
          valuation_version?: string | null
          valued_at?: string | null
          word_count: number
        }
        Update: {
          contains_hyphen?: boolean
          contains_number?: boolean
          created_at?: string
          current_on_deleted_list?: boolean
          domain?: string
          first_availability_observed_at?: string | null
          first_seen_at?: string
          hidden?: boolean
          id?: string
          last_seen_at?: string
          latest_asking_price?: number | null
          latest_availability_status?: string | null
          latest_buyer_demand?: Json | null
          latest_ingestion_run_id?: string | null
          latest_opportunity_score?: number | null
          latest_renewal_cost?: number | null
          latest_seo_metrics?: Json | null
          latest_valuation?: Json | null
          length?: number
          opportunity_classification?: string | null
          opportunity_concerns?: string[]
          opportunity_evidence_completeness?: number | null
          opportunity_evidence_level?: string | null
          opportunity_reasons?: string[]
          opportunity_risk_adjustment?: number
          opportunity_score_breakdown?: Json
          opportunity_scored_at?: string | null
          opportunity_scoring_version?: string | null
          preliminary_assessed_at?: string | null
          preliminary_breakdown?: Json
          preliminary_concerns?: string[]
          preliminary_eligible?: boolean
          preliminary_filter_version?: string | null
          preliminary_reasons?: string[]
          preliminary_score?: number | null
          removed_from_list_at?: string | null
          seo_enriched_at?: string | null
          seo_evidence_level?: string | null
          seo_provider?: string | null
          sld?: string
          source_url?: string
          tld?: string
          updated_at?: string
          valuation_version?: string | null
          valued_at?: string | null
          word_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "domains_latest_ingestion_run_id_fkey"
            columns: ["latest_ingestion_run_id"]
            isOneToOne: false
            referencedRelation: "ingestion_runs"
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
      ingestion_runs: {
        Row: {
          alert_failures: number
          alerts_sent: number
          api_calls_made: number
          api_failures: number
          candidates_enriched: number
          candidates_found: number
          candidates_rejected: number
          completed_at: string | null
          domains_newly_detected: number
          duration_ms: number | null
          error_count: number | null
          error_summary: string | null
          estimated_api_cost: number | null
          exceptional_opportunities_created: number
          execution_key: string | null
          existing_domains_updated: number
          id: string
          new_count: number | null
          observations_created: number
          parsed_count: number | null
          parser_version: string
          removed_count: number | null
          source_count: number | null
          source_timestamp: string | null
          source_url: string
          sources: Json
          started_at: string
          status: string
          strong_opportunities_created: number
          watch_opportunities_created: number
        }
        Insert: {
          alert_failures?: number
          alerts_sent?: number
          api_calls_made?: number
          api_failures?: number
          candidates_enriched?: number
          candidates_found?: number
          candidates_rejected?: number
          completed_at?: string | null
          domains_newly_detected?: number
          duration_ms?: number | null
          error_count?: number | null
          error_summary?: string | null
          estimated_api_cost?: number | null
          exceptional_opportunities_created?: number
          execution_key?: string | null
          existing_domains_updated?: number
          id?: string
          new_count?: number | null
          observations_created?: number
          parsed_count?: number | null
          parser_version: string
          removed_count?: number | null
          source_count?: number | null
          source_timestamp?: string | null
          source_url: string
          sources?: Json
          started_at?: string
          status: string
          strong_opportunities_created?: number
          watch_opportunities_created?: number
        }
        Update: {
          alert_failures?: number
          alerts_sent?: number
          api_calls_made?: number
          api_failures?: number
          candidates_enriched?: number
          candidates_found?: number
          candidates_rejected?: number
          completed_at?: string | null
          domains_newly_detected?: number
          duration_ms?: number | null
          error_count?: number | null
          error_summary?: string | null
          estimated_api_cost?: number | null
          exceptional_opportunities_created?: number
          execution_key?: string | null
          existing_domains_updated?: number
          id?: string
          new_count?: number | null
          observations_created?: number
          parsed_count?: number | null
          parser_version?: string
          removed_count?: number | null
          source_count?: number | null
          source_timestamp?: string | null
          source_url?: string
          sources?: Json
          started_at?: string
          status?: string
          strong_opportunities_created?: number
          watch_opportunities_created?: number
        }
        Relationships: []
      }
      intelligence_signal_sources: {
        Row: {
          claim_supported: string
          signal_id: string
          source_item_id: string
          support_strength: string
        }
        Insert: {
          claim_supported: string
          signal_id: string
          source_item_id: string
          support_strength: string
        }
        Update: {
          claim_supported?: string
          signal_id?: string
          source_item_id?: string
          support_strength?: string
        }
        Relationships: [
          {
            foreignKeyName: "intelligence_signal_sources_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "intelligence_signals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intelligence_signal_sources_source_item_id_fkey"
            columns: ["source_item_id"]
            isOneToOne: false
            referencedRelation: "source_items"
            referencedColumns: ["id"]
          },
        ]
      }
      intelligence_signals: {
        Row: {
          analyst_interpretation: string | null
          approved: boolean
          authority_score: number | null
          canonical_key: string
          categorisation: string
          composite_score: number | null
          confidence: Database["public"]["Enums"]["intelligence_confidence"]
          created_at: string
          direction: string | null
          effective_date: string | null
          event_date: string | null
          geography: string
          id: string
          impact_score: number | null
          ireland_read_across: string | null
          materiality_score: number | null
          magnitude: string | null
          novelty_score: number | null
          organisation_id: string | null
          publication_date: string
          recency_score: number | null
          scoring_version: string | null
          signal_family: string | null
          signal_type: string
          status: string
          summary: string
          title: string
          updated_at: string
        }
        Insert: {
          analyst_interpretation?: string | null
          approved?: boolean
          authority_score?: number | null
          canonical_key: string
          categorisation: string
          composite_score?: number | null
          confidence?: Database["public"]["Enums"]["intelligence_confidence"]
          created_at?: string
          direction?: string | null
          effective_date?: string | null
          event_date?: string | null
          geography: string
          id?: string
          impact_score?: number | null
          ireland_read_across?: string | null
          materiality_score?: number | null
          magnitude?: string | null
          novelty_score?: number | null
          organisation_id?: string | null
          publication_date: string
          recency_score?: number | null
          scoring_version?: string | null
          signal_family?: string | null
          signal_type: string
          status?: string
          summary: string
          title: string
          updated_at?: string
        }
        Update: {
          analyst_interpretation?: string | null
          approved?: boolean
          authority_score?: number | null
          canonical_key?: string
          categorisation?: string
          composite_score?: number | null
          confidence?: Database["public"]["Enums"]["intelligence_confidence"]
          created_at?: string
          direction?: string | null
          effective_date?: string | null
          event_date?: string | null
          geography?: string
          id?: string
          impact_score?: number | null
          ireland_read_across?: string | null
          materiality_score?: number | null
          magnitude?: string | null
          novelty_score?: number | null
          organisation_id?: string | null
          publication_date?: string
          recency_score?: number | null
          scoring_version?: string | null
          signal_family?: string | null
          signal_type?: string
          status?: string
          summary?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "intelligence_signals_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
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
      metric_cache: {
        Row: {
          created_at: string
          data: Json
          domain_id: string
          error_summary: string | null
          estimated_cost: number | null
          expires_at: string
          fetched_at: string
          id: string
          metric_type: string
          provider: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json
          domain_id: string
          error_summary?: string | null
          estimated_cost?: number | null
          expires_at: string
          fetched_at: string
          id?: string
          metric_type: string
          provider: string
          status: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json
          domain_id?: string
          error_summary?: string | null
          estimated_cost?: number | null
          expires_at?: string
          fetched_at?: string
          id?: string
          metric_type?: string
          provider?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "metric_cache_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
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
      product_page_benchmarks: {
        Row: {
          approved: boolean
          captured_at: string
          created_at: string
          id: string
          journey_stage: string | null
          observed_patterns: string[]
          organisation_id: string
          page_title: string | null
          page_url: string
          product_id: string | null
          screenshot_storage_path: string | null
          source_id: string
          updated_at: string
        }
        Insert: {
          approved?: boolean
          captured_at: string
          created_at?: string
          id?: string
          journey_stage?: string | null
          observed_patterns?: string[]
          organisation_id: string
          page_title?: string | null
          page_url: string
          product_id?: string | null
          screenshot_storage_path?: string | null
          source_id: string
          updated_at?: string
        }
        Update: {
          approved?: boolean
          captured_at?: string
          created_at?: string
          id?: string
          journey_stage?: string | null
          observed_patterns?: string[]
          organisation_id?: string
          page_title?: string | null
          page_url?: string
          product_id?: string | null
          screenshot_storage_path?: string | null
          source_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_page_benchmarks_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_page_benchmarks_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_page_benchmarks_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          advice_status: string | null
          application_method: string | null
          approved: boolean
          calculators: string[]
          category: string
          created_at: string
          digital_service_capabilities: string[]
          distribution_channels: string[]
          fees: string | null
          id: string
          key_features: string[]
          key_warnings: string[]
          last_verified_at: string
          name: string
          online_journey: string | null
          organisation_id: string
          pricing: string | null
          slug: string
          source_id: string
          status: Database["public"]["Enums"]["product_status"]
          target_audience: string | null
          updated_at: string
        }
        Insert: {
          advice_status?: string | null
          application_method?: string | null
          approved?: boolean
          calculators?: string[]
          category: string
          created_at?: string
          digital_service_capabilities?: string[]
          distribution_channels?: string[]
          fees?: string | null
          id?: string
          key_features?: string[]
          key_warnings?: string[]
          last_verified_at: string
          name: string
          online_journey?: string | null
          organisation_id: string
          pricing?: string | null
          slug: string
          source_id: string
          status?: Database["public"]["Enums"]["product_status"]
          target_audience?: string | null
          updated_at?: string
        }
        Update: {
          advice_status?: string | null
          application_method?: string | null
          approved?: boolean
          calculators?: string[]
          category?: string
          created_at?: string
          digital_service_capabilities?: string[]
          distribution_channels?: string[]
          fees?: string | null
          id?: string
          key_features?: string[]
          key_warnings?: string[]
          last_verified_at?: string
          name?: string
          online_journey?: string | null
          organisation_id?: string
          pricing?: string | null
          slug?: string
          source_id?: string
          status?: Database["public"]["Enums"]["product_status"]
          target_audience?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
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
      reference_targets: {
        Row: {
          access_licensing_note: string | null
          approved_for_fetch: boolean
          blocked_reason: string | null
          categorisation: string
          connector_source_class: string | null
          content_type: string
          created_at: string
          date_catalogued: string | null
          deduplication_key: string
          effective_date_required: boolean
          enabled: boolean
          endpoint_status: string | null
          expected_formats: string[]
          fetch_method: string
          geography: string
          historical_backfill: string | null
          id: number
          ingestion_readiness: string
          ingestion_url: string
          parser_strategy: string | null
          priority: string
          publication_date_required: boolean
          readiness_grade: string
          readiness_reason: string | null
          recommended_cadence: string | null
          record_type: string
          reference_key: string
          reference_stream: string
          reference_weight: number
          reference_year: number | null
          resolution_status: string
          signal_type: string
          source_id: string
          storage_policy: string | null
          target_discovery_rule: string | null
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          access_licensing_note?: string | null
          approved_for_fetch?: boolean
          blocked_reason?: string | null
          categorisation: string
          connector_source_class?: string | null
          content_type: string
          created_at?: string
          date_catalogued?: string | null
          deduplication_key: string
          effective_date_required?: boolean
          enabled?: boolean
          endpoint_status?: string | null
          expected_formats?: string[]
          fetch_method: string
          geography: string
          historical_backfill?: string | null
          id?: never
          ingestion_readiness: string
          ingestion_url: string
          parser_strategy?: string | null
          priority: string
          publication_date_required?: boolean
          readiness_grade: string
          readiness_reason?: string | null
          recommended_cadence?: string | null
          record_type: string
          reference_key: string
          reference_stream: string
          reference_weight: number
          reference_year?: number | null
          resolution_status: string
          signal_type: string
          source_id: string
          storage_policy?: string | null
          target_discovery_rule?: string | null
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          access_licensing_note?: string | null
          approved_for_fetch?: boolean
          blocked_reason?: string | null
          categorisation?: string
          connector_source_class?: string | null
          content_type?: string
          created_at?: string
          date_catalogued?: string | null
          deduplication_key?: string
          effective_date_required?: boolean
          enabled?: boolean
          endpoint_status?: string | null
          expected_formats?: string[]
          fetch_method?: string
          geography?: string
          historical_backfill?: string | null
          id?: never
          ingestion_readiness?: string
          ingestion_url?: string
          parser_strategy?: string | null
          priority?: string
          publication_date_required?: boolean
          readiness_grade?: string
          readiness_reason?: string | null
          recommended_cadence?: string | null
          record_type?: string
          reference_key?: string
          reference_stream?: string
          reference_weight?: number
          reference_year?: number | null
          resolution_status?: string
          signal_type?: string
          source_id?: string
          storage_policy?: string | null
          target_discovery_rule?: string | null
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "reference_targets_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
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
      report_snapshots: {
        Row: {
          domains_analysed: number
          generated_at: string
          id: string
          metrics: Json
          new_count: number
          portfolio_midpoint: number | null
          removed_count: number
          report_date: string
          run_id: string
          strong_buy_count: number | null
          verified_available_count: number | null
        }
        Insert: {
          domains_analysed: number
          generated_at?: string
          id?: string
          metrics?: Json
          new_count?: number
          portfolio_midpoint?: number | null
          removed_count?: number
          report_date: string
          run_id: string
          strong_buy_count?: number | null
          verified_available_count?: number | null
        }
        Update: {
          domains_analysed?: number
          generated_at?: string
          id?: string
          metrics?: Json
          new_count?: number
          portfolio_midpoint?: number | null
          removed_count?: number
          report_date?: string
          run_id?: string
          strong_buy_count?: number | null
          verified_available_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "report_snapshots_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: true
            referencedRelation: "ingestion_runs"
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
      source_chunks: {
        Row: {
          chunk_index: number
          claim_type: string | null
          content: string
          content_hash: string
          created_at: string
          embedding: string | null
          embedding_dimensions: number | null
          embedding_model: string | null
          id: number
          metadata: Json
          page_number: number | null
          search_vector: unknown
          section_label: string | null
          source_item_id: string
          token_count: number | null
        }
        Insert: {
          chunk_index: number
          claim_type?: string | null
          content: string
          content_hash: string
          created_at?: string
          embedding?: string | null
          embedding_dimensions?: number | null
          embedding_model?: string | null
          id?: never
          metadata?: Json
          page_number?: number | null
          search_vector?: unknown
          section_label?: string | null
          source_item_id: string
          token_count?: number | null
        }
        Update: {
          chunk_index?: number
          claim_type?: string | null
          content?: string
          content_hash?: string
          created_at?: string
          embedding?: string | null
          embedding_dimensions?: number | null
          embedding_model?: string | null
          id?: never
          metadata?: Json
          page_number?: number | null
          search_vector?: unknown
          section_label?: string | null
          source_item_id?: string
          token_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "source_chunks_source_item_id_fkey"
            columns: ["source_item_id"]
            isOneToOne: false
            referencedRelation: "source_items"
            referencedColumns: ["id"]
          },
        ]
      }
      source_connectors: {
        Row: {
          api_docs_url: string | null
          approved_for_fetch: boolean
          candidate_sitemap_url: string | null
          consecutive_failures: number
          created_at: string
          deduplication_key: string
          enabled: boolean
          endpoint_status: string
          endpoint_verified: boolean
          expected_formats: string[]
          historical_backfill: string | null
          id: number
          ingestion_route: string
          last_attempted_at: string | null
          last_succeeded_at: string | null
          parser_strategy: string
          primary_endpoint_url: string
          recommended_cadence: string
          reporting_archive_url: string | null
          robots_url: string | null
          source_id: string
          terms_review_required: boolean
          updated_at: string
        }
        Insert: {
          api_docs_url?: string | null
          approved_for_fetch?: boolean
          candidate_sitemap_url?: string | null
          consecutive_failures?: number
          created_at?: string
          deduplication_key: string
          enabled?: boolean
          endpoint_status: string
          endpoint_verified?: boolean
          expected_formats?: string[]
          historical_backfill?: string | null
          id?: never
          ingestion_route: string
          last_attempted_at?: string | null
          last_succeeded_at?: string | null
          parser_strategy: string
          primary_endpoint_url: string
          recommended_cadence: string
          reporting_archive_url?: string | null
          robots_url?: string | null
          source_id: string
          terms_review_required?: boolean
          updated_at?: string
        }
        Update: {
          api_docs_url?: string | null
          approved_for_fetch?: boolean
          candidate_sitemap_url?: string | null
          consecutive_failures?: number
          created_at?: string
          deduplication_key?: string
          enabled?: boolean
          endpoint_status?: string
          endpoint_verified?: boolean
          expected_formats?: string[]
          historical_backfill?: string | null
          id?: never
          ingestion_route?: string
          last_attempted_at?: string | null
          last_succeeded_at?: string | null
          parser_strategy?: string
          primary_endpoint_url?: string
          recommended_cadence?: string
          reporting_archive_url?: string | null
          robots_url?: string | null
          source_id?: string
          terms_review_required?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_connectors_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: true
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      source_ingestion_failures: {
        Row: {
          created_at: string
          error_code: string | null
          error_message: string
          id: number
          retryable: boolean
          run_id: string
          source_url: string | null
          stage: string
        }
        Insert: {
          created_at?: string
          error_code?: string | null
          error_message: string
          id?: never
          retryable?: boolean
          run_id: string
          source_url?: string | null
          stage: string
        }
        Update: {
          created_at?: string
          error_code?: string | null
          error_message?: string
          id?: never
          retryable?: boolean
          run_id?: string
          source_url?: string | null
          stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_ingestion_failures_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "source_ingestion_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      source_ingestion_runs: {
        Row: {
          attempt: number
          bytes_fetched: number
          completed_at: string | null
          connector_id: number | null
          created_at: string
          discovered_count: number
          error_count: number
          error_summary: string | null
          estimated_cost_eur: number | null
          execution_key: string
          fetched_count: number
          id: string
          metadata: Json
          parsed_count: number
          reference_target_id: number | null
          rejected_count: number
          run_type: string
          started_at: string | null
          status: string
          workflow_run_id: string | null
        }
        Insert: {
          attempt?: number
          bytes_fetched?: number
          completed_at?: string | null
          connector_id?: number | null
          created_at?: string
          discovered_count?: number
          error_count?: number
          error_summary?: string | null
          estimated_cost_eur?: number | null
          execution_key: string
          fetched_count?: number
          id?: string
          metadata?: Json
          parsed_count?: number
          reference_target_id?: number | null
          rejected_count?: number
          run_type: string
          started_at?: string | null
          status: string
          workflow_run_id?: string | null
        }
        Update: {
          attempt?: number
          bytes_fetched?: number
          completed_at?: string | null
          connector_id?: number | null
          created_at?: string
          discovered_count?: number
          error_count?: number
          error_summary?: string | null
          estimated_cost_eur?: number | null
          execution_key?: string
          fetched_count?: number
          id?: string
          metadata?: Json
          parsed_count?: number
          reference_target_id?: number | null
          rejected_count?: number
          run_type?: string
          started_at?: string | null
          status?: string
          workflow_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "source_ingestion_runs_connector_id_fkey"
            columns: ["connector_id"]
            isOneToOne: false
            referencedRelation: "source_connectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_ingestion_runs_reference_target_id_fkey"
            columns: ["reference_target_id"]
            isOneToOne: false
            referencedRelation: "reference_targets"
            referencedColumns: ["id"]
          },
        ]
      }
      source_item_organisations: {
        Row: {
          organisation_id: string
          relationship: string
          source_item_id: string
        }
        Insert: {
          organisation_id: string
          relationship?: string
          source_item_id: string
        }
        Update: {
          organisation_id?: string
          relationship?: string
          source_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_item_organisations_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_item_organisations_source_item_id_fkey"
            columns: ["source_item_id"]
            isOneToOne: false
            referencedRelation: "source_items"
            referencedColumns: ["id"]
          },
        ]
      }
      source_items: {
        Row: {
          announcement_date: string | null
          approved: boolean
          canonical_url: string
          content_hash: string | null
          content_type: string
          created_at: string
          effective_date: string | null
          evidence_classification: string | null
          evidence_source_id: string | null
          extracted_facts: Json
          factual_summary: string | null
          fetch_status: string
          fetched_at: string | null
          id: string
          item_key: string
          last_verified_at: string | null
          metadata: Json
          parent_source_id: string
          publication_date: string | null
          raw_storage_path: string | null
          reference_target_id: number | null
          rejection_reason: string | null
          title: string
          updated_at: string
        }
        Insert: {
          announcement_date?: string | null
          approved?: boolean
          canonical_url: string
          content_hash?: string | null
          content_type: string
          created_at?: string
          effective_date?: string | null
          evidence_classification?: string | null
          evidence_source_id?: string | null
          extracted_facts?: Json
          factual_summary?: string | null
          fetch_status?: string
          fetched_at?: string | null
          id?: string
          item_key: string
          last_verified_at?: string | null
          metadata?: Json
          parent_source_id: string
          publication_date?: string | null
          raw_storage_path?: string | null
          reference_target_id?: number | null
          rejection_reason?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          announcement_date?: string | null
          approved?: boolean
          canonical_url?: string
          content_hash?: string | null
          content_type?: string
          created_at?: string
          effective_date?: string | null
          evidence_classification?: string | null
          evidence_source_id?: string | null
          extracted_facts?: Json
          factual_summary?: string | null
          fetch_status?: string
          fetched_at?: string | null
          id?: string
          item_key?: string
          last_verified_at?: string | null
          metadata?: Json
          parent_source_id?: string
          publication_date?: string | null
          raw_storage_path?: string | null
          reference_target_id?: number | null
          rejection_reason?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_items_evidence_source_id_fkey"
            columns: ["evidence_source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_items_parent_source_id_fkey"
            columns: ["parent_source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_items_reference_target_id_fkey"
            columns: ["reference_target_id"]
            isOneToOne: false
            referencedRelation: "reference_targets"
            referencedColumns: ["id"]
          },
        ]
      }
      source_registry_imports: {
        Row: {
          blocked_count: number
          completed_at: string | null
          created_at: string
          discovery_count: number
          dry_run: boolean
          id: number
          import_key: string
          ready_count: number
          source_count: number
          started_at: string
          status: string
          target_count: number
          validation_errors: Json
          workbook_name: string
          workbook_sha256: string
        }
        Insert: {
          blocked_count?: number
          completed_at?: string | null
          created_at?: string
          discovery_count?: number
          dry_run?: boolean
          id?: never
          import_key: string
          ready_count?: number
          source_count?: number
          started_at?: string
          status: string
          target_count?: number
          validation_errors?: Json
          workbook_name: string
          workbook_sha256: string
        }
        Update: {
          blocked_count?: number
          completed_at?: string | null
          created_at?: string
          discovery_count?: number
          dry_run?: boolean
          id?: never
          import_key?: string
          ready_count?: number
          source_count?: number
          started_at?: string
          status?: string
          target_count?: number
          validation_errors?: Json
          workbook_name?: string
          workbook_sha256?: string
        }
        Relationships: []
      }
      sources: {
        Row: {
          access_licensing_note: string | null
          accessed_at: string
          approved_public: boolean
          canonical_domain: string | null
          canonical_url: string
          categorisation: string | null
          created_at: string
          credibility_tier: number
          evidence_classification: string | null
          geography: string | null
          id: string
          implementation_notes: string | null
          notes: string | null
          primary_source: boolean
          priority: string | null
          publication_date: string | null
          publisher: string
          registry_active: boolean
          registry_kind: string
          registry_status: string
          signal_type: string | null
          source_class: string | null
          source_key: string | null
          source_type: string
          source_weight: number | null
          storage_policy: string | null
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          access_licensing_note?: string | null
          accessed_at?: string
          approved_public?: boolean
          canonical_domain?: string | null
          canonical_url: string
          categorisation?: string | null
          created_at?: string
          credibility_tier: number
          evidence_classification?: string | null
          geography?: string | null
          id?: string
          implementation_notes?: string | null
          notes?: string | null
          primary_source?: boolean
          priority?: string | null
          publication_date?: string | null
          publisher: string
          registry_active?: boolean
          registry_kind?: string
          registry_status?: string
          signal_type?: string | null
          source_class?: string | null
          source_key?: string | null
          source_type: string
          source_weight?: number | null
          storage_policy?: string | null
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          access_licensing_note?: string | null
          accessed_at?: string
          approved_public?: boolean
          canonical_domain?: string | null
          canonical_url?: string
          categorisation?: string | null
          created_at?: string
          credibility_tier?: number
          evidence_classification?: string | null
          geography?: string | null
          id?: string
          implementation_notes?: string | null
          notes?: string | null
          primary_source?: boolean
          priority?: string | null
          publication_date?: string | null
          publisher?: string
          registry_active?: boolean
          registry_kind?: string
          registry_status?: string
          signal_type?: string | null
          source_class?: string | null
          source_key?: string | null
          source_type?: string
          source_weight?: number | null
          storage_policy?: string | null
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
      apply_buyer_intelligence: {
        Args: {
          candidates: Json
          demand: Json
          researched_at: string
          target_domain_id: string
        }
        Returns: number
      }
      apply_domain_opportunity_scores: {
        Args: { score_rows: Json }
        Returns: number
      }
      apply_domain_preliminary_scores: {
        Args: { score_rows: Json }
        Returns: number
      }
      apply_domain_valuations: {
        Args: { valuation_rows: Json }
        Returns: number
      }
      apply_observation_buyer_demand: {
        Args: { demand: Json; target_domain_id: string; target_run_id: string }
        Returns: number
      }
      apply_observation_opportunity_scores: {
        Args: { observation_rows: Json }
        Returns: number
      }
      apply_observation_valuations: {
        Args: { observation_rows: Json }
        Returns: number
      }
      is_admin: { Args: never; Returns: boolean }
      claim_source_ingestion_runs: {
        Args: { p_limit?: number }
        Returns: { id: string }[]
      }
      review_source_item: {
        Args: {
          p_decision: string
          p_item_id: string
          p_publication_date?: string | null
          p_reason?: string | null
        }
        Returns: {
          evidence_source_id: string | null
          review_status: string
        }[]
      }
      search_approved_source_chunks: {
        Args: { result_limit?: number; search_query: string }
        Returns: {
          chunk_content: string
          credibility_tier: number
          evidence_classification: string | null
          evidence_source_id: string
          organisation_names: string[]
          page_number: number | null
          primary_source: boolean
          publication_date: string | null
          publisher: string
          relevance: number
          section_label: string | null
          source_item_id: string
          source_type: string
          title: string
          url: string
        }[]
      }
    }
    Enums: {
      app_role: "public" | "admin"
      capability_status:
        | "available"
        | "partial"
        | "pilot"
        | "planned"
        | "not_available"
        | "insufficient_evidence"
      intelligence_confidence: "high" | "medium" | "low" | "insufficient"
      materiality_class: "critical" | "significant" | "watchlist" | "exclude"
      product_status: "active" | "withdrawn" | "announced" | "unknown"
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
      capability_status: [
        "available",
        "partial",
        "pilot",
        "planned",
        "not_available",
        "insufficient_evidence",
      ],
      intelligence_confidence: ["high", "medium", "low", "insufficient"],
      materiality_class: ["critical", "significant", "watchlist", "exclude"],
      product_status: ["active", "withdrawn", "announced", "unknown"],
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
