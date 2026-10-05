# Cliente compartido — Tasks 2D/2E/2F

env.ts valida lazy URL + publishable key antes del único cliente browser tipado Database.
SDK 2.117.2 fijado, chunk dinámico iniciado en bootstrap antes de consumidores/listeners.
2E: flowType=implicit, persistSession/autoRefreshToken/detectSessionInUrl=true, debug=false.
SDK administra storage/refresh/fragment; sin copia manual de JWT. Sin env, cuenta no disponible
y Carta error controlado. AuthProvider/sessionStore en features/auth, query/mapper en
features/menu; cards no importan tipos DB. No secretos, Auth Admin API ni economía.
2F usa este mismo singleton en features/authority/admin; filtro membership self, contexto tenant
por DB, whitelist de catálogo y upload nuevo sin metadata/overwrite/delete. Sin private REST.
A-S2-006 APPROVED incorpora únicamente RPC pública booleana self sin AAL y vista
Platform read-only con MFA SDK separado. Config y SDK de 2E intactos; sin autoridad durable.
