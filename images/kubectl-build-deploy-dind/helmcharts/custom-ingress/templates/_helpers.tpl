{{/* vim: set filetype=mustache: */}}
{{/*
Expand the name of the chart.
*/}}
{{- define "custom-ingress.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
*/}}
{{- define "custom-ingress.fullname" -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- end -}}


{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "custom-ingress.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Common labels
*/}}
{{- define "custom-ingress.labels" -}}
helm.sh/chart: {{ include "custom-ingress.chart" . }}
{{ include "custom-ingress.selectorLabels" . }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{ include "custom-ingress.lagoobernetesLabels" . }}

{{- end -}}

{{/*
Selector labels
*/}}
{{- define "custom-ingress.selectorLabels" -}}
app.kubernetes.io/name: {{ include "custom-ingress.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{/*
Lagoobernetes Labels
*/}}
{{- define "custom-ingress.lagoobernetesLabels" -}}
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
{{- define "custom-ingress.annotations" -}}
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