{{/* vim: set filetype=mustache: */}}
{{/*
Expand the name of the chart.
*/}}
{{- define "nginx.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
*/}}
{{- define "nginx.fullname" -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "nginx.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create full hostname for autogenerated hosts
*/}}
{{- define "nginx.autogeneratedHost" -}}
{{- printf "%s.%s" .Release.Name .Values.routesAutogenerateSuffix | trimSuffix "-" -}}
{{- end -}}

{{/*
Common labels
*/}}
{{- define "nginx.labels" -}}
helm.sh/chart: {{ include "nginx.chart" . }}
{{ include "nginx.selectorLabels" . }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{ include "nginx.lagoobernetesLabels" . }}
{{- end -}}

{{/*
Selector labels
*/}}
{{- define "nginx.selectorLabels" -}}
app.kubernetes.io/name: {{ include "nginx.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{/*
Create a PriorityClassName.
(this is based on the Lagoobernetes Environment Type)).
*/}}
{{- define "nginx.lagoobernetesPriority" -}}
{{- printf "lagoobernetes-priority-%s" .Values.environmentType }}
{{- end -}}

{{/*
Lagoobernetes Labels
*/}}
{{- define "nginx.lagoobernetesLabels" -}}
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
{{- define "nginx.annotations" -}}
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