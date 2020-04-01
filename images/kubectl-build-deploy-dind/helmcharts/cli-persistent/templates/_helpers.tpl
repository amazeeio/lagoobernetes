{{/* vim: set filetype=mustache: */}}
{{/*
Expand the name of the chart.
*/}}
{{- define "cli-persistent.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
*/}}
{{- define "cli-persistent.fullname" -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "cli-persistent.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Common labels
*/}}
{{- define "cli-persistent.labels" -}}
helm.sh/chart: {{ include "cli-persistent.chart" . }}
{{ include "cli-persistent.selectorLabels" . }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{ include "cli-persistent.lagoobernetesLabels" . }}

{{- end -}}

{{/*
Selector labels
*/}}
{{- define "cli-persistent.selectorLabels" -}}
app.kubernetes.io/name: {{ include "cli-persistent.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{/*
Create a PriorityClassName.
(this is based on the Lagoobernetes Environment Type)).
*/}}
{{- define "cli-persistent.lagoobernetesPriority" -}}
{{- printf "lagoobernetes-priority-%s" .Values.environmentType }}
{{- end -}}

{{/*
Lagoobernetes Labels
*/}}
{{- define "cli-persistent.lagoobernetesLabels" -}}
lagoobernetes/service: {{ .Release.Name }}
lagoobernetes/service-type: {{ .Chart.Name }}
lagoobernetes/project: {{ .Values.project }}
lagoobernetes/environment: {{ .Values.environment }}
lagoobernetes/environmentType: {{ .Values.environmentType }}
lagoobernetes/buildType: {{ .Values.buildType }}
{{- end -}}

{{/*
Annotations
*/}}
{{- define "cli-persistent.annotations" -}}
lagoobernetes/version: {{ .Values.lagoobernetesVersion | quote }}
{{- if .Values.branch }}
lagoobernetes/branch: {{ .Values.branch | quote }}
{{- end }}
{{- if .Values.prNumber }}
lagoobernetes/prNumber: {{ .Values.prNumber | quote }}
lagoobernetes/prHeadBranch: {{ .Values.prHeadBranch | quote }}
lagoobernetes/prBaseBranch: {{ .Values.prBaseBranch | quote }}
{{- end }}
{{- end -}}